-- Superintendent scope nonprofits "ready" view
--
-- Purpose:
-- - Provide a single row per superintendent_scope_nonprofits record with
--   quick IRS readiness signals + latest filing rollups.
-- - Expose a stable `scope_id` (the PK of superintendent_scope_nonprofits)
--   so the UI can reference the scope row without relying on an `id` nested
--   under `scope`.
--
-- Notes:
-- - EINs are stored normalized as 9 digits (no dash).
-- - `total_net_assets` uses net_assets_end from latest_financials.

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
  ssn.id as scope_id
from
  public.superintendent_scope_nonprofits ssn
  left join irs.organizations o on o.ein = ssn.ein
  left join irs.latest_returns lr on lr.ein = ssn.ein
  left join irs.latest_financials lf on lf.ein = ssn.ein;