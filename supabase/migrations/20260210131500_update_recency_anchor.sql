begin;

-- Prefer filed_on when present, otherwise tax_period_end.
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
    coalesce(r.filed_on, r.tax_period_end) desc nulls last,
    r.tax_year desc,
    r.updated_at desc nulls last,
    r.id desc
  limit 1;

  update irs.organizations o
  set latest_return_id = v_best_return_id
  where o.ein = p_ein;
end;
$$;

create or replace view irs.latest_returns as
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
  coalesce(r.filed_on, r.tax_period_end) desc nulls last,
  r.tax_year desc,
  r.updated_at desc nulls last;

-- Ensure filing_recency_days uses coalesce anchor explicitly.
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
    when coalesce(lr.filed_on, lr.tax_period_end) is not null
      then (current_date - coalesce(lr.filed_on, lr.tax_period_end)::date)
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
