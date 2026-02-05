-- Ensure irs.organizations has a stable, insertable, UNIQUE ein_normalized (9 digits)
-- This migration is designed to work whether ein_normalized is missing, nullable, or GENERATED ALWAYS.

begin;

-- 1) Helper: normalize EIN to 9 digits (strip non-digits)
create or replace function irs.normalize_ein(p_ein text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p_ein, ''), '[^0-9]', '', 'g'), '');
$$;

-- 2) Ensure column exists and is INSERTABLE.
-- If ein_normalized exists but is GENERATED ALWAYS, we replace it with a normal text column.
do $$
declare
  v_is_generated text;
  v_has_col boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'irs'
      and table_name = 'organizations'
      and column_name = 'ein_normalized'
  ) into v_has_col;

  if not v_has_col then
    execute 'alter table irs.organizations add column ein_normalized text';
  else
    -- In Postgres, generated columns show as is_generated = 'ALWAYS'
    select c.is_generated
      into v_is_generated
    from information_schema.columns c
    where c.table_schema = 'irs'
      and c.table_name = 'organizations'
      and c.column_name = 'ein_normalized';

    if v_is_generated = 'ALWAYS' then
      -- Replace generated column with a normal text column
      execute 'alter table irs.organizations add column if not exists ein_normalized_tmp text';
      execute 'update irs.organizations set ein_normalized_tmp = irs.normalize_ein(ein) where ein_normalized_tmp is null';
      execute 'alter table irs.organizations drop column ein_normalized';
      execute 'alter table irs.organizations rename column ein_normalized_tmp to ein_normalized';
    end if;
  end if;
end
$$;

-- 3) Backfill and keep in sync.
update irs.organizations
set ein_normalized = irs.normalize_ein(ein)
where ein_normalized is null
  or ein_normalized = ''
  or ein_normalized <> irs.normalize_ein(ein);

-- 4) Trigger to maintain ein_normalized on write.
create or replace function irs.tg_set_ein_normalized()
returns trigger
language plpgsql
as $$
begin
  -- Always recompute from EIN if EIN is provided/changed.
  if new.ein is not null then
    new.ein_normalized := irs.normalize_ein(new.ein);
  end if;

  return new;
end;
$$;

-- Drop/recreate trigger (idempotent)
drop trigger if exists trg_irs_organizations_set_ein_normalized on irs.organizations;

create trigger trg_irs_organizations_set_ein_normalized
before insert or update of ein
on irs.organizations
for each row
execute function irs.tg_set_ein_normalized();

-- 5) Enforce uniqueness for reliable UPSERT.
-- If duplicates exist, the index creation will fail; that is intentional.
create unique index if not exists organizations_ein_normalized_uidx
  on irs.organizations (ein_normalized);

-- Optional but helpful for name search
create extension if not exists pg_trgm with schema extensions;

create index if not exists organizations_normalized_legal_name_trgm_idx
  on irs.organizations
  using gin (normalized_legal_name gin_trgm_ops);

commit;