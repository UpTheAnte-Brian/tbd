

-- Canonicalize EIN storage: store EINs as 9-digit normalized strings everywhere.
-- Keep column name `ein` for compatibility, and provide a formatter for UI.
--
-- Assumptions:
-- - You have cleared IRS data (or can tolerate updates).
-- - Existing EINs may be dashed; this migration normalizes them in-place.
-- - Any remaining dashed EINs will be normalized in-place.

begin;

create or replace function irs.normalize_ein(p_ein text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p_ein, ''), '[^0-9]', '', 'g'), '');
$$;

-- 2) Helper: display EIN with a dash (XX-XXXXXXX)
create or replace function irs.format_ein(ein_digits text)
returns text
language sql
immutable
as $$
  select case
    when ein_digits is null then null
    when ein_digits ~ '^[0-9]{9}$' then
      substring(ein_digits from 1 for 2) || '-' || substring(ein_digits from 3 for 7)
    else
      -- If the input isn't a clean 9 digits, return as-is so UI can still show something.
      ein_digits
  end
$$;

-- 3) irs.organizations: force `ein` to be normalized digits.
update irs.organizations
set ein = irs.normalize_ein(ein)
where ein is not null and ein !~ '^[0-9]{9}$';

-- Ensure all org EINs are normalized.
-- (If you truly deleted all IRS data, this should be no-ops but safe.)
-- Add/replace check constraint.
alter table irs.organizations
  drop constraint if exists organizations_ein_chk;

alter table irs.organizations
  add constraint organizations_ein_chk
  check (ein ~ '^[0-9]{9}$');

-- Ensure ein is unique and indexable.
create unique index if not exists organizations_ein_uidx on irs.organizations (ein);

-- If `ein_normalized` exists, we no longer need it.
-- Drop related check/indexes if any.
alter table irs.organizations
  drop constraint if exists organizations_ein_normalized_chk;

drop index if exists irs.organizations_ein_normalized_idx;

-- Drop dependent views before removing ein_normalized
drop view if exists public.v_district_scope_nonprofits;

alter table irs.organizations
  drop column if exists ein_normalized;

-- Recreate v_district_scope_nonprofits without ein_normalized
create view public.v_district_scope_nonprofits as
select
  ssn.district_entity_id,
  ssn.ein,
  ssn.tier,
  ssn.status,
  ssn.label,
  o.legal_name,
  o.city,
  o.state,
  o.country
from public.superintendent_scope_nonprofits ssn
join irs.organizations o
  on o.ein = ssn.ein;

-- 4) irs.returns: normalize EIN values and remove now-redundant normalized column/trigger.
update irs.returns
set ein = irs.normalize_ein(ein)
where ein is not null and ein !~ '^[0-9]{9}$';

-- Ensure returns.ein remains an FK to organizations.ein (now normalized).
-- Drop old normalized artifacts.
alter table irs.returns
  drop constraint if exists returns_ein_normalized_chk;

drop index if exists irs.returns_ein_normalized_idx;

drop trigger if exists trg_irs_returns_set_ein_normalized on irs.returns;

-- Drop dependent views before removing returns.ein_normalized
-- (latest_financials depends on latest_returns; superintendent_scope_nonprofits_ready depends on latest_returns)
drop view if exists irs.latest_financials;
drop view if exists public.superintendent_scope_nonprofits_ready;
drop view if exists irs.latest_returns;

alter table irs.returns
  drop column if exists ein_normalized;

create view irs.latest_returns as
select distinct on (r.ein)
  r.id,
  r.ein,
  r.return_type,
  r.tax_year,
  r.tax_period_start,
  r.tax_period_end,
  r.filed_on,
  r.irs_object_id,
  r.return_name,
  r.source_priority,
  r.created_at,
  r.updated_at
from irs.returns r
where r.ein ~ '^[0-9]{9}$'
order by
  r.ein,
  r.tax_period_end desc nulls last,
  r.filed_on desc nulls last,
  r.tax_year desc,
  r.updated_at desc;

create view irs.latest_financials as
select
  lr.ein,
  lr.return_type,
  lr.tax_year,
  f.return_id,
  f.total_revenue,
  f.total_expenses,
  f.excess_or_deficit,
  f.total_assets_begin,
  f.total_assets_end,
  f.total_liabilities_begin,
  f.total_liabilities_end,
  f.net_assets_begin,
  f.net_assets_end,
  f.contributions,
  f.program_service_revenue,
  f.investment_income,
  f.fundraising_gross,
  f.program_expenses,
  f.management_general_expenses,
  f.fundraising_expenses,
  f.source_map,
  f.created_at,
  f.updated_at
from irs.latest_returns lr
join irs.return_financials f
  on f.return_id = lr.id;

create view public.superintendent_scope_nonprofits_ready as
select
  ssn.district_entity_id,
  ssn.ein,
  ssn.tier,
  ssn.status,
  ssn.label,
  (o.ein is not null) as has_irs_org,
  (lr.id is not null) as has_returns,
  lr.tax_year as latest_tax_year,
  lf.total_revenue,
  lf.net_assets_end as total_net_assets,
  lr.tax_period_end,
  lr.filed_on
from public.superintendent_scope_nonprofits ssn
left join irs.organizations o
  on o.ein = ssn.ein
left join irs.latest_returns lr
  on lr.ein = ssn.ein
left join irs.latest_financials lf
  on lf.ein = ssn.ein;

-- Tighten EIN format on returns for future inserts.
alter table irs.returns
  drop constraint if exists returns_ein_chk;

alter table irs.returns
  add constraint returns_ein_chk
  check (ein ~ '^[0-9]{9}$');

-- 5) irs.entity_links: normalize EIN values and remove redundant normalized column.
update irs.entity_links
set ein = irs.normalize_ein(ein)
where ein is not null and ein !~ '^[0-9]{9}$';

alter table irs.entity_links
  drop column if exists ein_normalized;

-- (Optional) add a check constraint for safety.
alter table irs.entity_links
  drop constraint if exists entity_links_ein_chk;

alter table irs.entity_links
  add constraint entity_links_ein_chk
  check (ein ~ '^[0-9]{9}$');

-- 6) superintendent_scope_nonprofits (public schema): normalize EIN if present.
-- You mentioned you already removed dashes here, but keep it consistent.
update public.superintendent_scope_nonprofits
set ein = irs.normalize_ein(ein)
where ein is not null and ein !~ '^[0-9]{9}$';

alter table public.superintendent_scope_nonprofits
  drop constraint if exists superintendent_scope_nonprofits_ein_chk;

alter table public.superintendent_scope_nonprofits
  add constraint superintendent_scope_nonprofits_ein_chk
  check (ein ~ '^[0-9]{9}$');

commit;

-- Notes for UI:
-- - Store EINs as 9 digits (e.g., "411619499").
-- - Display with dash using: `select irs.format_ein(ein)`.
