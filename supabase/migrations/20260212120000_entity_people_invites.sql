begin;

create table if not exists public.entity_person_roles (
  id uuid primary key default gen_random_uuid(),

  entity_id uuid not null
    references public.entities(id) on delete cascade,

  -- IRS provenance
  source_system text not null,
  source_ref text not null,

  display_name text not null,
  role_title text null,
  is_officer boolean null,
  tax_year int null,

  reportable_compensation numeric null,
  other_compensation numeric null,

  -- Enrichment fields (editable in UI)
  email text null,
  phone text null,

  -- Linking to actual platform user
  linked_user_id uuid null
    references public.profiles(id) on delete set null,

  -- Invite state
  invite_status text not null default 'none'
    check (invite_status in ('none', 'ready', 'invited', 'joined')),

  invited_at timestamptz null,
  joined_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint entity_person_roles_entity_source_unique
    unique (entity_id, source_system, source_ref)
);

create index if not exists entity_person_roles_entity_idx
  on public.entity_person_roles(entity_id);

create index if not exists entity_person_roles_linked_user_idx
  on public.entity_person_roles(linked_user_id);

-- Keep updated_at current
drop trigger if exists trg_entity_person_roles_updated_at on public.entity_person_roles;
create trigger trg_entity_person_roles_updated_at
before update on public.entity_person_roles
for each row execute function public.set_updated_at();

create table if not exists public.entity_user_invites (
  id uuid primary key default gen_random_uuid(),

  entity_id uuid not null
    references public.entities(id) on delete cascade,

  entity_person_role_id uuid null
    references public.entity_person_roles(id) on delete set null,

  email text not null,
  desired_role public.entity_user_role not null,

  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),

  invited_by uuid not null
    references public.profiles(id) on delete cascade,

  invited_at timestamptz not null default now(),
  accepted_at timestamptz null,
  expires_at timestamptz not null,

  created_at timestamptz not null default now()
);

create index if not exists entity_user_invites_entity_idx
  on public.entity_user_invites(entity_id);

create index if not exists entity_user_invites_email_idx
  on public.entity_user_invites(email);

commit;
