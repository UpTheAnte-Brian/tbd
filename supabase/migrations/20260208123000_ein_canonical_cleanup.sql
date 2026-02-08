-- Canonical EIN cleanup: remove ein_normalized usage and re-create dependent views/functions.

begin;

-- Normalize EINs in-place (idempotent safety).
update irs.organizations
set ein = irs.normalize_ein(ein)
where ein is not null and ein !~ '^[0-9]{9}$';

update irs.returns
set ein = irs.normalize_ein(ein)
where ein is not null and ein !~ '^[0-9]{9}$';

update irs.entity_links
set ein = irs.normalize_ein(ein)
where ein is not null and ein !~ '^[0-9]{9}$';

update public.superintendent_scope_nonprofits
set ein = irs.normalize_ein(ein)
where ein is not null and ein !~ '^[0-9]{9}$';

-- Drop/recreate dependent views FIRST (dependency order matters).
-- v_district_scope_nonprofits depends on irs.latest_returns/irs.latest_financials and public.superintendent_scope_nonprofits_ready.
-- public.superintendent_scope_nonprofits_ready depends on irs.latest_financials.
-- irs.latest_financials depends on irs.latest_returns.

drop view if exists public.v_district_scope_nonprofits;
drop view if exists public.superintendent_scope_nonprofits_ready;
drop view if exists irs.latest_financials;
drop view if exists irs.latest_returns;

alter table irs.organizations drop column if exists ein_normalized;
alter table irs.returns drop column if exists ein_normalized;
alter table irs.entity_links drop column if exists ein_normalized;

drop index if exists irs.organizations_ein_normalized_idx;
drop index if exists irs.returns_ein_normalized_idx;

alter table irs.organizations drop constraint if exists organizations_ein_normalized_chk;
alter table irs.returns drop constraint if exists returns_ein_normalized_chk;

-- Drop old function signature first (CREATE OR REPLACE cannot rename input parameters).
drop function if exists irs.refresh_latest_return_id(text);
-- Refresh function/trigger now operate on canonical EIN.
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

create or replace function irs.tg_refresh_latest_return_id()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    perform irs.refresh_latest_return_id(new.ein);
    return new;
  elsif (tg_op = 'UPDATE') then
    perform irs.refresh_latest_return_id(old.ein);
    perform irs.refresh_latest_return_id(new.ein);
    return new;
  elsif (tg_op = 'DELETE') then
    perform irs.refresh_latest_return_id(old.ein);
    return old;
  end if;
  return null;
end;
$$;

create view irs.latest_returns as
select distinct on (r.ein, r.return_type)
  r.id,
  r.ein,
  r.return_type,
  r.tax_year,
  r.tax_period_start,
  r.tax_period_end,
  r.filed_on,
  r.irs_object_id,
  r.source_system,
  r.is_amended,
  r.is_terminated,
  r.principal_officer_name,
  r.gross_receipts_cap,
  r.created_at,
  r.updated_at
from irs.returns r
order by
  r.ein,
  r.return_type,
  r.tax_year desc;

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
join irs.return_financials f on f.return_id = lr.id;

create view public.superintendent_scope_nonprofits_ready as
select
  ssn.district_entity_id,
  ssn.ein,
  ssn.tier,
  ssn.status,
  ssn.label,
  o.ein is not null as has_irs_org,
  lr.id is not null as has_returns,
  lr.tax_year as latest_tax_year,
  lf.total_revenue,
  lf.net_assets_end as total_net_assets,
  lr.tax_period_end,
  lr.filed_on,
  ssn.id as scope_id
from public.superintendent_scope_nonprofits ssn
left join irs.organizations o on o.ein = ssn.ein
left join irs.latest_returns lr on lr.ein = ssn.ein
left join irs.latest_financials lf on lf.ein = ssn.ein;

create view public.v_district_scope_nonprofits as
select
  s.district_entity_id,
  s.ein,
  s.label as scope_label,
  s.tier,
  s.status,
  (coalesce(el.entity_id, s.entity_id) is not null) as has_entity,
  coalesce(el.entity_id, s.entity_id) as entity_id,
  o.legal_name as irs_legal_name,
  o.city as irs_city,
  o.state as irs_state,
  (o.ein is not null) as has_irs_org,
  (lr.id is not null) as has_returns,
  lr.tax_year as latest_tax_year,
  lr.return_type::text as latest_return_type,
  rf.total_revenue,
  rf.total_expenses,
  rf.net_assets_end,
  case
    when lr.filed_on is not null then (current_date - lr.filed_on::date)
    when lr.tax_period_end is not null then (current_date - lr.tax_period_end::date)
    else null
  end as filing_recency_days,
  case
    when lr.id is null then null
    else exists (select 1 from irs.return_people rp where rp.return_id = lr.id)
  end as people_parse_ok,
  case
    when lr.id is null then null
    else exists (select 1 from irs.return_narratives rn where rn.return_id = lr.id)
  end as narratives_ok
from public.superintendent_scope_nonprofits s
left join irs.organizations o on o.ein = s.ein
left join irs.returns lr on lr.id = o.latest_return_id
left join irs.return_financials rf on rf.return_id = lr.id
left join irs.entity_links el on el.ein = s.ein;

commit;
