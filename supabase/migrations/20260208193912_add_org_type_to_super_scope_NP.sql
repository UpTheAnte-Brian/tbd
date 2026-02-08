

begin;

-- TECH DEBT CLEANUP: we removed `ein_normalized` columns from IRS tables.
-- The old trigger/function still tries to write `new.ein_normalized`, which breaks inserts/updates.
-- Safe to drop (idempotent).

drop trigger if exists trg_irs_organizations_set_ein_normalized on irs.organizations;
drop function if exists irs.tg_set_ein_normalized();

alter table public.superintendent_scope_nonprofits
  add column if not exists org_type public.org_type not null default 'external_charity';

create unique index if not exists ssn_one_district_foundation_per_district
  on public.superintendent_scope_nonprofits (district_entity_id)
  where org_type = 'district_foundation';

-- Backfill behavior: activation should also create the public.nonprofits shell
-- even if irs.entity_links already exists (older activations).

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

  -- IMPORTANT: do NOT filter out rows that already have irs.entity_links.
  -- We want this RPC to be idempotent and to backfill public.nonprofits shells.
  for rec in
    select
      s.ein,
      s.label,
      s.org_type,
      s.entity_id as scope_entity_id,
      el.entity_id as link_entity_id,
      o.legal_name
    from public.superintendent_scope_nonprofits s
    left join irs.entity_links el on el.ein = s.ein
    left join irs.organizations o on o.ein = s.ein
    where s.district_entity_id = p_district_entity_id
      and (p_eins is null or s.ein = any(p_eins))
  loop
    begin
      v_entity_id := null;

      -- Always compute the display name for nonprofit shell creation/upsert
      v_name := coalesce(
        nullif(trim(rec.legal_name), ''),
        nullif(trim(rec.label), ''),
        concat('Nonprofit ', rec.ein)
      );

      -- Resolve entity_id (prefer scope, then existing IRS link, then entities.external_ids)
      if rec.scope_entity_id is not null then
        v_entity_id := rec.scope_entity_id;
      elsif rec.link_entity_id is not null then
        v_entity_id := rec.link_entity_id;
      else
        select e.id into v_existing_entity_id
        from public.entities e
        where e.external_ids->>'ein' = rec.ein
        limit 1;

        if v_existing_entity_id is not null then
          v_entity_id := v_existing_entity_id;
        else
          -- Create a new entity
          v_base_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
          v_base_slug := regexp_replace(v_base_slug, '(^-+|-+$)', '', 'g');
          if v_base_slug is null or length(v_base_slug) = 0 then
            v_base_slug := 'nonprofit';
          end if;

          v_slug := v_base_slug;
          v_suffix := 1;
          loop
            exit when not exists (
              select 1
              from public.entities
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
        -- 1) Ensure IRS link exists (idempotent)
        insert into irs.entity_links (ein, entity_id, match_type, confidence)
        values (rec.ein, v_entity_id, 'scoped_auto', 100)
        on conflict (ein) do update
          set entity_id = excluded.entity_id;

        -- 2) Ensure scope row points at the entity
        update public.superintendent_scope_nonprofits
          set entity_id = v_entity_id
          where district_entity_id = p_district_entity_id
            and ein = rec.ein
            and (entity_id is null or entity_id <> v_entity_id);

        -- 3) Ensure nonprofit shell exists (idempotent)
        -- org_type comes from superintendent_scope_nonprofits.org_type (default external_charity)
        insert into public.nonprofits (entity_id, name, ein, org_type)
        values (
          v_entity_id,
          v_name,
          rec.ein,
          rec.org_type
        )
        on conflict (ein) do update
          set
            entity_id = excluded.entity_id,
            name = excluded.name,
            org_type = excluded.org_type,
            updated_at = now();

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