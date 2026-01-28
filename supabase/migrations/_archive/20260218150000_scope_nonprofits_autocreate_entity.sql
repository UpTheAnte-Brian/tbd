-- Auto-create entities for superintendent scope nonprofits without entity_id

create or replace function public.ensure_scope_nonprofit_entity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_entity_id uuid;
  v_name text;
  v_base_slug text;
  v_slug text;
  v_suffix int := 1;
begin
  -- Only act if entity_id is missing
  if new.entity_id is not null then
    return new;
  end if;

  -- Basic sanity
  if new.ein is null or length(trim(new.ein)) = 0 then
    raise exception 'superintendent_scope_nonprofits.ein cannot be null/empty';
  end if;

  v_name := coalesce(nullif(trim(new.label), ''), concat('Nonprofit ', new.ein));

  -- Try to find existing entity by EIN in external_ids
  select e.id into v_existing_entity_id
  from public.entities e
  where e.external_ids->>'ein' = new.ein
  limit 1;

  if v_existing_entity_id is not null then
    new.entity_id := v_existing_entity_id;
    return new;
  end if;

  -- Build a slug from name and ensure uniqueness for entity_type
  v_base_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
  v_base_slug := regexp_replace(v_base_slug, '(^-+|-+$)', '', 'g');
  if v_base_slug is null or length(v_base_slug) = 0 then
    v_base_slug := 'nonprofit';
  end if;

  v_slug := v_base_slug;
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
    jsonb_build_object('ein', new.ein, 'source', 'superintendent_scope')
  )
  returning id into new.entity_id;

  return new;
end;
$$;

-- Trigger: fire on INSERT and on UPDATE when entity_id is null

drop trigger if exists trg_scope_nonprofit_autocreate_entity on public.superintendent_scope_nonprofits;

create trigger trg_scope_nonprofit_autocreate_entity
before insert or update of entity_id, ein, label
on public.superintendent_scope_nonprofits
for each row
execute function public.ensure_scope_nonprofit_entity();
