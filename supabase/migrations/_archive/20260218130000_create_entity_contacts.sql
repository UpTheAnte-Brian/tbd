-- public.entity_contacts
create table if not exists public.entity_contacts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,

  contact_role text not null, -- e.g. 'superintendent'
  name text null,
  email text null,
  phone text null,

  source_system text not null, -- e.g. 'mde'
  source_formid text not null, -- e.g. '0277-01' (district_metadata.formid)
  source_url text not null,

  is_current boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  raw jsonb null
);

create index if not exists entity_contacts_entity_role_current_idx
  on public.entity_contacts (entity_id, contact_role, is_current);

create index if not exists entity_contacts_source_idx
  on public.entity_contacts (source_system, source_formid);

-- Optional: prevents exact duplicates for same source/email
create unique index if not exists entity_contacts_source_role_email_uniq
  on public.entity_contacts (source_system, source_formid, contact_role, coalesce(email, ''));

alter table public.entity_contacts enable row level security;

-- Minimal RLS: allow authenticated read (you can tighten later).
-- Scripts will use service role anyway.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='entity_contacts'
      and policyname='entity_contacts_read_authenticated'
  ) then
    create policy entity_contacts_read_authenticated
      on public.entity_contacts
      for select
      to authenticated
      using (true);
  end if;
end $$;
