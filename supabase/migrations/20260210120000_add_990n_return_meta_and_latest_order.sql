begin;

-- Add flexible metadata for 990-N (e-Postcard) filings.
alter table irs.returns
  add column if not exists return_meta jsonb;

-- Helpful index for filtering by return type + tax year.
create index if not exists returns_return_type_tax_year_idx
  on irs.returns (return_type, tax_year desc);

-- Ensure latest_return_id prefers the newest tax year when dates are missing.
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
    r.tax_year desc,
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

-- Keep latest_returns aligned with the new ordering signals.
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
  r.tax_year desc,
  r.tax_period_end desc nulls last,
  r.filed_on desc nulls last;

-- Backfill latest_return_id after the ordering change.
with best as (
  select
    o.ein as org_ein,
    (
      select r.id
      from irs.returns r
      where r.ein = o.ein
      order by
        r.tax_year desc,
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
