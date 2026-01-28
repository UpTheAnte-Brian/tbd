-- Entity onboarding progress + overrides (nonprofit onboarding)
-- Safe to run multiple times.

-- 1) entity onboarding progress (resumable checklist)
create table if not exists public.entity_onboarding_progress (
  entity_id uuid not null references public.entities(id) on delete cascade,
  section text not null,
  status text not null default 'pending', -- pending|complete|skipped
  last_updated timestamptz not null default now(),
  primary key (entity_id, section)
);

create index if not exists idx_entity_onboarding_progress_entity
  on public.entity_onboarding_progress(entity_id);

alter table public.entity_onboarding_progress enable row level security;

-- RLS (placeholder): allow entity admins to read/write
-- NOTE: adjust helper function names to your actual authorization model.
create policy "entity admins can read onboarding progress"
  on public.entity_onboarding_progress
  for select
  using (governance.can_read_entity(entity_id, auth.uid()));

create policy "entity admins can upsert onboarding progress"
  on public.entity_onboarding_progress
  for insert
  with check (governance.can_read_entity(entity_id, auth.uid()));

create policy "entity admins can update onboarding progress"
  on public.entity_onboarding_progress
  for update
  using (governance.can_read_entity(entity_id, auth.uid()))
  with check (governance.can_read_entity(entity_id, auth.uid()));

-- 2) entity field overrides (manual vs ingested values)
create table if not exists public.entity_field_overrides (
  entity_id uuid not null references public.entities(id) on delete cascade,
  namespace text not null,            -- e.g. 'nonprofit.profile'
  field_key text not null,            -- e.g. 'ein', 'legal_name', 'mission'
  value jsonb not null,
  source text not null default 'manual', -- manual|irs|pdf|ai
  confidence int not null default 100,
  updated_at timestamptz not null default now(),
  updated_by uuid null,
  primary key (entity_id, namespace, field_key)
);

create index if not exists idx_entity_field_overrides_entity
  on public.entity_field_overrides(entity_id);

alter table public.entity_field_overrides enable row level security;

create policy "entity admins can read overrides"
  on public.entity_field_overrides
  for select
  using (governance.can_read_entity(entity_id, auth.uid()));

create policy "entity admins can write overrides"
  on public.entity_field_overrides
  for insert
  with check (governance.can_read_entity(entity_id, auth.uid()));

create policy "entity admins can update overrides"
  on public.entity_field_overrides
  for update
  using (governance.can_read_entity(entity_id, auth.uid()))
  with check (governance.can_read_entity(entity_id, auth.uid()));
