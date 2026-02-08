

-- Fix: activation should also create a nonprofit shell row (public.nonprofits)
-- Notes:
-- - EINs are stored normalized as 9 digits (no dash).
-- - Idempotent: safe to re-run; uses upsert on (entity_id).

begin;

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

  -- Only activate EINs that don't already have an IRS link row.
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

      -- Prefer a pre-existing entity_id on the scope row.
      if rec.scope_entity_id is not null then
        v_entity_id := rec.scope_entity_id;
      else
        -- Otherwise, try to find an existing entity by external_ids.ein.
        select e.id into v_existing_entity_id
        from public.entities e
        where e.external_ids->>'ein' = rec.ein
        limit 1;

        if v_existing_entity_id is not null then
          v_entity_id := v_existing_entity_id;
        else
          -- Create a new entity.
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
        -- 1) Create IRS link (idempotent)
        insert into irs.entity_links (ein, entity_id, match_type, confidence)
        values (rec.ein, v_entity_id, 'scoped_auto', 100)
        on conflict (ein) do nothing;

        -- 2) Ensure superintendent scope row points at the entity
        update public.superintendent_scope_nonprofits
          set entity_id = v_entity_id
          where district_entity_id = p_district_entity_id
            and ein = rec.ein
            and entity_id is null;

        -- 3) Create (or update) the nonprofit shell row.
        --    This is what the admin UI expects to exist after activation.
        insert into public.nonprofits (entity_id, name, ein, org_type)
        values (
          v_entity_id,
          v_name,
          rec.ein,
          'nonprofit'
        )
        on conflict (entity_id) do update
          set
            name = excluded.name,
            ein = excluded.ein,
            org_type = excluded.org_type;

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

commit;