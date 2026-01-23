create table if not exists public.documents (
  id uuid not null default gen_random_uuid (),
  entity_id uuid not null,
  document_type public.document_type not null,
  title text not null,
  visibility public.document_visibility not null default 'internal'::document_visibility,
  status public.document_status not null default 'active'::document_status,
  current_version_id uuid null,
  effective_start date null,
  effective_end date null,
  created_at timestamp with time zone not null default now(),
  created_by uuid null,
  updated_at timestamp with time zone not null default now(),
  constraint documents_pkey primary key (id),
  constraint documents_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null,
  constraint documents_entity_id_fkey foreign KEY (entity_id) references entities (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists documents_entity_idx on public.documents using btree (entity_id) TABLESPACE pg_default;

create index IF not exists documents_type_idx on public.documents using btree (entity_id, document_type) TABLESPACE pg_default;

-- -----------------------------------------------------------------------------
-- Trigger functions (documents / document_versions)
-- -----------------------------------------------------------------------------

-- Assign version numbers per document when inserting a new version.
-- Uses a lightweight MAX() + 1; safe for typical usage. If you need strict
-- concurrency guarantees, you can upgrade this later to an advisory lock.
create or replace function public.set_document_version_number()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_next integer;
begin
  -- If caller provided one explicitly, keep it.
  if new.version_number is not null then
    return new;
  end if;

  select coalesce(max(dv.version_number), 0) + 1
    into v_next
  from public.document_versions dv
  where dv.document_id = new.document_id;

  new.version_number := v_next;
  return new;
end;
$$;

-- Stamp approval metadata when a version transitions to approved.
-- NOTE: RLS does not apply to triggers; authorization should be enforced by
-- the API/RPC paths that perform approvals.
create or replace function public.on_document_version_approved()
returns trigger
language plpgsql
security invoker
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  -- Only act on a transition to approved.
  if old.status is distinct from new.status
     and new.status = 'approved'::public.document_version_status then

    if new.approved_at is null then
      new.approved_at := now();
    end if;

    if new.approved_by is null then
      new.approved_by := auth.uid();
    end if;
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------

-- Keep updated_at current
drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at BEFORE
update on public.documents for EACH row
execute FUNCTION public.set_updated_at();

create table if not exists public.document_versions (
  id uuid not null default gen_random_uuid (),
  document_id uuid not null,
  version_number integer null,
  status public.document_version_status not null default 'draft'::document_version_status,
  content_md text null,
  storage_bucket text null,
  storage_path text null,
  mime_type text null,
  file_sha256 text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null,
  approved_at timestamp with time zone null,
  approved_by uuid null,
  approved_by_meeting_id uuid null,
  review_notes text null,
  constraint document_versions_pkey primary key (id),
  constraint document_versions_approved_by_fkey foreign KEY (approved_by) references auth.users (id) on delete set null,
  constraint document_versions_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null,
  constraint document_versions_document_id_fkey foreign KEY (document_id) references documents (id) on delete CASCADE
) TABLESPACE pg_default;

create unique INDEX IF not exists document_versions_doc_ver_uq on public.document_versions using btree (document_id, version_number) TABLESPACE pg_default;

create index IF not exists document_versions_doc_idx on public.document_versions using btree (document_id) TABLESPACE pg_default;

create index IF not exists document_versions_status_idx on public.document_versions using btree (document_id, status) TABLESPACE pg_default;

-- Keep updated_at current
drop trigger if exists set_document_versions_updated_at on public.document_versions;
create trigger set_document_versions_updated_at BEFORE
update on public.document_versions for EACH row
execute FUNCTION public.set_updated_at();

-- Stamp approval metadata on status transition
drop trigger if exists trg_on_document_version_approved on public.document_versions;
create trigger trg_on_document_version_approved BEFORE
update OF status on public.document_versions for EACH row
execute FUNCTION public.on_document_version_approved();

-- Auto-assign version numbers per document
drop trigger if exists trg_set_document_version_number on public.document_versions;
create trigger trg_set_document_version_number BEFORE INSERT on public.document_versions for EACH row
execute FUNCTION public.set_document_version_number();

alter table public.documents
  drop constraint if exists documents_current_version_fk;

alter table public.documents
  add constraint documents_current_version_fk
  foreign key (current_version_id)
  references public.document_versions (id)
  deferrable initially deferred;

create table if not exists public.businesses (
  id uuid not null default gen_random_uuid (),
  place_id text null,
  name text not null,
  address text null,
  lat double precision null,
  lng double precision null,
  phone_number text null,
  website text null,
  types text[] null,
  status text not null default 'pending'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  entity_id uuid not null,
  constraint businesses_pkey primary key (id),
  constraint businesses_place_id_key unique (place_id),
  constraint businesses_entity_id_fk foreign KEY (entity_id) references entities (id),
  constraint businesses_status_check check (
    (
      status = any (
        array['pending'::text, 'active'::text, 'inactive'::text]
      )
    )
  )
) TABLESPACE pg_default;

create unique INDEX IF not exists businesses_entity_id_uidx on public.businesses using btree (entity_id) TABLESPACE pg_default;

drop trigger if exists set_businesses_updated_at on public.businesses;
create trigger set_businesses_updated_at BEFORE
update on public.businesses for EACH row
execute FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS + Grants + Policies: Documents / Document Versions
-- -----------------------------------------------------------------------------

alter table public.documents enable row level security;
alter table public.document_versions enable row level security;

-- Base privileges (RLS still applies)
grant select on table public.documents to anon, authenticated;
grant insert, update, delete on table public.documents to authenticated;

grant select on table public.document_versions to anon, authenticated;
grant insert, update, delete on table public.document_versions to authenticated;

-- Documents
-- Public read (only public + active)
drop policy if exists "documents read" on public.documents;
create policy "documents read"
  on public.documents
  for select
  to anon, authenticated
  using (
    visibility = 'public'::public.document_visibility
    and status = 'active'::public.document_status
  );

-- Entity users can read docs for their entity (active membership)
drop policy if exists "documents read entity users" on public.documents;
create policy "documents read entity users"
  on public.documents
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.entity_users eu
      where eu.entity_id = documents.entity_id
        and eu.user_id = auth.uid()
        and eu.status = 'active'
    )
  );

-- Admin write controls (global admin OR entity admin)
drop policy if exists "documents insert admin" on public.documents;
create policy "documents insert admin"
  on public.documents
  for insert
  to authenticated
  with check (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(entity_id, auth.uid())
  );

drop policy if exists "documents update admin" on public.documents;
create policy "documents update admin"
  on public.documents
  for update
  to authenticated
  using (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(entity_id, auth.uid())
  )
  with check (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(entity_id, auth.uid())
  );

drop policy if exists "documents delete admin" on public.documents;
create policy "documents delete admin"
  on public.documents
  for delete
  to authenticated
  using (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(entity_id, auth.uid())
  );

-- Document Versions
-- Public read versions only when the parent document is public + active
-- (Note: this is intentionally conservative; entity users get broader access below.)
drop policy if exists "document_versions read" on public.document_versions;
create policy "document_versions read"
  on public.document_versions
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.documents d
      where d.id = document_versions.document_id
        and d.visibility = 'public'::public.document_visibility
        and d.status = 'active'::public.document_status
    )
  );

-- Entity users can read versions for documents in their entity
drop policy if exists "document_versions read by document access" on public.document_versions;
create policy "document_versions read by document access"
  on public.document_versions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.documents d
      join public.entity_users eu
        on eu.entity_id = d.entity_id
      where d.id = document_versions.document_id
        and eu.user_id = auth.uid()
        and eu.status = 'active'
    )
  );

-- Allow authors to update their own draft versions (non-admin convenience)
drop policy if exists "document_versions update" on public.document_versions;
create policy "document_versions update"
  on public.document_versions
  for update
  to authenticated
  using (
    created_by = auth.uid()
    and status = 'draft'::public.document_version_status
  )
  with check (
    created_by = auth.uid()
  );

-- Admin insert/update/delete (based on the parent document entity)
drop policy if exists "document_versions insert admin" on public.document_versions;
create policy "document_versions insert admin"
  on public.document_versions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.documents d
      where d.id = document_versions.document_id
        and (
          public.is_global_admin(auth.uid())
          or public.is_entity_admin(d.entity_id, auth.uid())
        )
    )
  );

drop policy if exists "document_versions update admin" on public.document_versions;
create policy "document_versions update admin"
  on public.document_versions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.documents d
      where d.id = document_versions.document_id
        and (
          public.is_global_admin(auth.uid())
          or public.is_entity_admin(d.entity_id, auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1
      from public.documents d
      where d.id = document_versions.document_id
        and (
          public.is_global_admin(auth.uid())
          or public.is_entity_admin(d.entity_id, auth.uid())
        )
    )
  );

drop policy if exists "document_versions delete admin" on public.document_versions;
create policy "document_versions delete admin"
  on public.document_versions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.documents d
      where d.id = document_versions.document_id
        and (
          public.is_global_admin(auth.uid())
          or public.is_entity_admin(d.entity_id, auth.uid())
        )
    )
  );