-- Add entity_id to donations/subscriptions and link to entities.
-- Safe to run multiple times.

-- donations.entity_id
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='donations' and column_name='entity_id'
  ) then
    alter table public.donations add column entity_id uuid null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'donations_entity_id_fkey'
  ) then
    alter table public.donations
      add constraint donations_entity_id_fkey
      foreign key (entity_id) references public.entities(id);
  end if;
end $$;

create index if not exists donations_entity_id_idx on public.donations(entity_id);

-- subscriptions.entity_id
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='subscriptions' and column_name='entity_id'
  ) then
    alter table public.subscriptions add column entity_id uuid null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_entity_id_fkey'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_entity_id_fkey
      foreign key (entity_id) references public.entities(id);
  end if;
end $$;

create index if not exists subscriptions_entity_id_idx on public.subscriptions(entity_id);
