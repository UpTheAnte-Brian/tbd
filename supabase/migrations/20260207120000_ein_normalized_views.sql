-- Ensure latest IRS views + district scope view expose EINs for filtering.

drop view if exists public.superintendent_scope_nonprofits_ready;
drop view if exists irs.latest_financials;
drop view if exists irs.latest_returns;

create view irs.latest_returns as
select distinct on (
  r.ein,
  r.return_type
)
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
  s.id,
  s.district_entity_id,
  s.ein,
  s.label,
  s.tier,
  s.status,
  s.created_at,
  s.updated_at,
  s.entity_id,
  (s.entity_id is not null) as has_entity,
  (
    exists (
      select 1
      from irs.entity_links l
      where l.entity_id = s.entity_id
    )
  ) as has_irs_link,
  (
    exists (
      select 1
      from irs.latest_returns r
      where r.ein = s.ein
    )
  ) as has_returns,
  s.entity_id is not null
  and (
    exists (
      select 1
      from irs.entity_links l
      where l.entity_id = s.entity_id
    )
  )
  and s.status = 'active'::text as is_ready
from superintendent_scope_nonprofits s;

create or replace view public.v_district_scope_nonprofits as
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
