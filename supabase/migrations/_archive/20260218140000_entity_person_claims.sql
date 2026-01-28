-- Entity person claims (board member email linking)
create table if not exists public.entity_person_claims (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  source text not null default 'irs',
  source_person_id text not null,
  email text not null,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  unique (entity_id, source, source_person_id)
);

create index if not exists entity_person_claims_entity_idx
  on public.entity_person_claims(entity_id);

create index if not exists entity_person_claims_email_idx
  on public.entity_person_claims(email);

alter table public.entity_person_claims enable row level security;

create policy "entity admins can read person claims"
  on public.entity_person_claims
  for select
  using (governance.can_read_entity(entity_id, auth.uid()));

create policy "entity admins can insert person claims"
  on public.entity_person_claims
  for insert
  with check (governance.can_read_entity(entity_id, auth.uid()));

create policy "entity admins can update person claims"
  on public.entity_person_claims
  for update
  using (governance.can_read_entity(entity_id, auth.uid()))
  with check (governance.can_read_entity(entity_id, auth.uid()));
