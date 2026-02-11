begin;

-- Backfill primary mailing address from the most recent 990-N return per EIN.
-- This avoids relying on irs.organizations.latest_return_id (which may point to 990/990EZ).
insert into public.entity_addresses (
  entity_id,
  label,
  address1,
  address2,
  city,
  state,
  postal,
  country,
  source_system,
  source_ref,
  is_primary
)
select
  coalesce(ssn.entity_id, el.entity_id) as entity_id,
  'mailing' as label,
  r.return_meta->'mailing_address'->>'line1' as address1,
  r.return_meta->'mailing_address'->>'line2' as address2,
  r.return_meta->'mailing_address'->>'city' as city,
  r.return_meta->'mailing_address'->>'state' as state,
  r.return_meta->'mailing_address'->>'zip' as postal,
  coalesce(r.return_meta->'mailing_address'->>'country', 'US') as country,
  'irs_990n' as source_system,
  r.id::text as source_ref,
  true as is_primary
from public.superintendent_scope_nonprofits ssn
left join irs.entity_links el on el.ein = ssn.ein
join lateral (
  select r.*
  from irs.returns r
  where r.ein = ssn.ein
    and r.return_type = '990N'
    and r.return_meta->'mailing_address'->>'line1' is not null
  order by r.tax_year desc nulls last, r.created_at desc
  limit 1
) r on true
where coalesce(ssn.entity_id, el.entity_id) is not null
  and not exists (
    select 1
    from public.entity_addresses ea
    where ea.entity_id = coalesce(ssn.entity_id, el.entity_id)
      and ea.is_primary = true
  );

commit;
