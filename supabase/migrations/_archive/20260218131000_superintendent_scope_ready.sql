-- Add entity link + readiness view for superintendent scope nonprofits

alter table public.superintendent_scope_nonprofits
  add column if not exists entity_id uuid null
    references public.entities(id) on delete set null;

create index if not exists idx_scope_nps_district_status
  on public.superintendent_scope_nonprofits(district_entity_id, status);

create index if not exists idx_scope_nps_entity
  on public.superintendent_scope_nonprofits(entity_id);

create or replace view public.superintendent_scope_nonprofits_ready as
select
  s.*,
  (s.entity_id is not null) as has_entity,
  exists (
    select 1 from irs.entity_links l
    where l.entity_id = s.entity_id
  ) as has_irs_link,
  exists (
    select 1 from irs.latest_returns r
    where r.ein = s.ein
  ) as has_returns,
  (
    s.entity_id is not null
    and exists (select 1 from irs.entity_links l where l.entity_id = s.entity_id)
    and s.status = 'active'
  ) as is_ready
from public.superintendent_scope_nonprofits s;
