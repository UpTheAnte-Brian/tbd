

-- Maintain irs.organizations.latest_return_id as the most recent return (by tax_period_end)
-- for each organization EIN.

begin;

-- 1) Column + FK (idempotent)
alter table irs.organizations
  add column if not exists latest_return_id uuid;

-- Add FK if it doesn't exist
DO $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'irs'
      and t.relname = 'organizations'
      and c.conname = 'organizations_latest_return_id_fkey'
  ) then
    alter table irs.organizations
      add constraint organizations_latest_return_id_fkey
      foreign key (latest_return_id)
      references irs.returns (id)
      on delete set null;
  end if;
end $$;

create index if not exists organizations_latest_return_id_idx
  on irs.organizations (latest_return_id);

-- 2) Ensure we have a helpful index on returns for the refresh query
create index if not exists returns_ein_tax_period_end_idx
  on irs.returns (ein, tax_period_end desc);

-- 3) Refresh function (single-EIN)
create or replace function irs.refresh_latest_return_id(p_ein text)
returns void
language plpgsql
as $$
declare
  v_best_return_id uuid;
begin
  if p_ein is null or p_ein = '' then
    return;
  end if;

  select r.id
    into v_best_return_id
  from irs.returns r
  where r.ein = p_ein
  order by
    r.tax_period_end desc nulls last,
    r.filed_on desc nulls last,
    r.updated_at desc nulls last,
    r.id desc
  limit 1;

  update irs.organizations o
  set latest_return_id = v_best_return_id
  where o.ein = p_ein;
end;
$$;

-- 4) Trigger to keep latest_return_id current when returns change
create or replace function irs.tg_refresh_latest_return_id()
returns trigger
language plpgsql
as $$
declare
  v_ein text;
begin
  if (tg_op = 'INSERT') then
    v_ein := new.ein;
    perform irs.refresh_latest_return_id(v_ein);
    return new;
  elsif (tg_op = 'UPDATE') then
    -- refresh for both old and new EIN in case it changed
    perform irs.refresh_latest_return_id(old.ein);
    perform irs.refresh_latest_return_id(new.ein);
    return new;
  elsif (tg_op = 'DELETE') then
    v_ein := old.ein;
    perform irs.refresh_latest_return_id(v_ein);
    return old;
  end if;

  return null;
end;
$$;

-- Drop/recreate trigger (idempotent)
drop trigger if exists trg_irs_returns_refresh_latest_return_id on irs.returns;

create trigger trg_irs_returns_refresh_latest_return_id
after insert or update of ein, tax_period_end, filed_on or delete
on irs.returns
for each row
execute function irs.tg_refresh_latest_return_id();

-- 5) Backfill latest_return_id for existing data
with best as (
  select
    o.ein as org_ein,
    (
      select r.id
      from irs.returns r
      where r.ein = o.ein
      order by
        r.tax_period_end desc nulls last,
        r.filed_on desc nulls last,
        r.updated_at desc nulls last,
        r.id desc
      limit 1
    ) as best_return_id
  from irs.organizations o
  where o.ein is not null
)
update irs.organizations o
set latest_return_id = b.best_return_id
from best b
where o.ein = b.org_ein
  and o.latest_return_id is distinct from b.best_return_id;

commit;
