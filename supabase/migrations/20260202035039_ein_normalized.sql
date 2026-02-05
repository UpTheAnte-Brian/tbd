

-- Canonical EIN handling for IRS schema
-- Option A: keep `ein` as dashed/display, enforce `ein_normalized` as the canonical 9-digit join key.

-- 1) Ensure columns exist
alter table if exists irs.organizations
  add column if not exists ein_normalized text;

alter table if exists irs.returns
  add column if not exists ein_normalized text;

-- 2) Backfill `ein_normalized` from existing `ein` values (strip non-digits)
update irs.organizations
set ein_normalized = regexp_replace(ein, '[^0-9]', '', 'g')
where (ein_normalized is null or ein_normalized = '')
  and ein is not null;

update irs.returns
set ein_normalized = regexp_replace(ein, '[^0-9]', '', 'g')
where (ein_normalized is null or ein_normalized = '')
  and ein is not null;

-- 3) Enforce 9-digit normalized EIN format
-- Use NOT VALID so existing bad rows (if any) don’t block migration; validate after cleanup.
alter table if exists irs.organizations
  drop constraint if exists organizations_ein_normalized_chk;

alter table if exists irs.organizations
  add constraint organizations_ein_normalized_chk
  check (ein_normalized is null or ein_normalized ~ '^[0-9]{9}$')
  not valid;

alter table if exists irs.returns
  drop constraint if exists returns_ein_normalized_chk;

alter table if exists irs.returns
  add constraint returns_ein_normalized_chk
  check (ein_normalized is null or ein_normalized ~ '^[0-9]{9}$')
  not valid;

-- 4) Index for joins/filters
create index if not exists organizations_ein_normalized_idx
  on irs.organizations (ein_normalized);

create index if not exists returns_ein_normalized_idx
  on irs.returns (ein_normalized);

-- 5) Unique guardrails (optional but recommended): one org per normalized EIN
-- This mirrors your existing organizations_ein_normalized_uidx if present; keep idempotent.
create unique index if not exists organizations_ein_normalized_uidx
  on irs.organizations (ein_normalized)
  where ein_normalized is not null;

-- 6) Keep returns.ein_normalized in sync when returns.ein is inserted/updated
-- (Organizations already has tg_set_ein_normalized(); returns needs its own trigger.)
create or replace function irs.tg_set_returns_ein_normalized()
returns trigger
language plpgsql
as $$
begin
  if new.ein is null then
    new.ein_normalized := null;
  else
    new.ein_normalized := regexp_replace(new.ein, '[^0-9]', '', 'g');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_irs_returns_set_ein_normalized on irs.returns;
create trigger trg_irs_returns_set_ein_normalized
before insert or update of ein
on irs.returns
for each row
execute function irs.tg_set_returns_ein_normalized();

-- 7) (Optional) Validate constraints. If this fails, you have bad data to clean.
-- Comment these out if you prefer to validate later.
alter table if exists irs.organizations validate constraint organizations_ein_normalized_chk;
alter table if exists irs.returns validate constraint returns_ein_normalized_chk;