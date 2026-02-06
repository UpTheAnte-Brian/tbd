-- View: district scoped nonprofit rows for UI
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

-- RPC: bulk activate scoped nonprofits for a district
create or replace function public.activate_scoped_nonprofits(
  p_district_entity_id uuid,
  p_eins text[] default null
)
returns table(
  activated_count int,
  skipped_count int,
  errors jsonb,
  activated_eins text[]
)
language plpgsql
security definer
set search_path = public, irs
as $$
declare
  v_errors jsonb := '[]'::jsonb;
  v_activated text[] := array[]::text[];
  v_activated_count int := 0;
  v_total int := 0;
  rec record;
  v_entity_id uuid;
  v_existing_entity_id uuid;
  v_name text;
  v_base_slug text;
  v_slug text;
  v_suffix int;
begin
  select count(*) into v_total
  from public.superintendent_scope_nonprofits s
  where s.district_entity_id = p_district_entity_id
    and (p_eins is null or s.ein = any(p_eins));

  for rec in
    select
      s.ein,
      s.label,
      s.entity_id as scope_entity_id,
      o.legal_name
    from public.superintendent_scope_nonprofits s
    left join irs.entity_links el on el.ein = s.ein
    left join irs.organizations o on o.ein = s.ein
    where s.district_entity_id = p_district_entity_id
      and (p_eins is null or s.ein = any(p_eins))
      and el.ein is null
  loop
    begin
      v_entity_id := null;
      if rec.scope_entity_id is not null then
        v_entity_id := rec.scope_entity_id;
      else
        select e.id into v_existing_entity_id
        from public.entities e
        where e.external_ids->>'ein' = rec.ein
        limit 1;

        if v_existing_entity_id is not null then
          v_entity_id := v_existing_entity_id;
        else
          v_name := coalesce(
            nullif(trim(rec.legal_name), ''),
            nullif(trim(rec.label), ''),
            concat('Nonprofit ', rec.ein)
          );

          v_base_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
          v_base_slug := regexp_replace(v_base_slug, '(^-+|-+$)', '', 'g');
          if v_base_slug is null or length(v_base_slug) = 0 then
            v_base_slug := 'nonprofit';
          end if;

          v_slug := v_base_slug;
          v_suffix := 1;
          loop
            exit when not exists (
              select 1 from public.entities
              where entity_type = 'nonprofit' and slug = v_slug
            );

            v_suffix := v_suffix + 1;
            if v_suffix > 50 then
              v_slug := v_base_slug || '-' || substring(md5(random()::text) from 1 for 6);
              exit;
            end if;
            v_slug := v_base_slug || '-' || v_suffix;
          end loop;

          insert into public.entities (entity_type, name, slug, external_ids)
          values (
            'nonprofit',
            v_name,
            v_slug,
            jsonb_build_object('ein', rec.ein, 'source', 'activate_scoped_nonprofits')
          )
          returning id into v_entity_id;
        end if;
      end if;

      if v_entity_id is not null then
        insert into irs.entity_links (ein, entity_id, match_type, confidence)
        values (rec.ein, v_entity_id, 'scoped_auto', 100)
        on conflict (ein) do nothing;

        update public.superintendent_scope_nonprofits
          set entity_id = v_entity_id
          where district_entity_id = p_district_entity_id
            and ein = rec.ein
            and entity_id is null;

        v_activated_count := v_activated_count + 1;
        v_activated := array_append(v_activated, rec.ein);
      else
        v_errors := v_errors || jsonb_build_object('ein', rec.ein, 'error', 'failed_to_resolve_entity');
      end if;
    exception when others then
      v_errors := v_errors || jsonb_build_object('ein', rec.ein, 'error', sqlerrm);
    end;
  end loop;

  return query
  select v_activated_count,
         greatest(v_total - v_activated_count, 0),
         v_errors,
         v_activated;
end;
$$;
