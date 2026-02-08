begin;

create or replace view public.superintendent_scope_nonprofits_ready as
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
  lr.filed_on,
  ssn.id as scope_id,
  ssn.org_type,
  ssn.entity_id
from public.superintendent_scope_nonprofits ssn
left join irs.organizations o on o.ein = ssn.ein
left join irs.latest_returns lr on lr.ein = ssn.ein
left join irs.latest_financials lf on lf.ein = ssn.ein;

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
  end as narratives_ok,
  s.org_type
from public.superintendent_scope_nonprofits s
left join irs.organizations o on o.ein = s.ein
left join irs.returns lr on lr.id = o.latest_return_id
left join irs.return_financials rf on rf.return_id = lr.id
left join irs.entity_links el on el.ein = s.ein;

commit;
