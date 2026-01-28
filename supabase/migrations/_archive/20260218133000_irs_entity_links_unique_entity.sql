-- Option A: allow many EINs per entity (district bootstrap etc.)
-- Do NOT enforce unique(entity_id). That would prevent one entity linking to multiple EINs.
-- Keep PK on (ein). Optionally add a composite unique index (entity_id, ein) for future-proofing.

do $$
begin
  -- If an earlier attempt created the bad unique index, remove it safely.
  if exists (
    select 1
    from pg_indexes
    where schemaname = 'irs'
      and indexname = 'entity_links_entity_id_uidx'
  ) then
    execute 'drop index irs.entity_links_entity_id_uidx';
  end if;

  -- Optional (redundant with PK(ein), but harmless / future-proof):
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'irs'
      and indexname = 'entity_links_entity_id_ein_uidx'
  ) then
    execute 'create unique index entity_links_entity_id_ein_uidx on irs.entity_links(entity_id, ein)';
  end if;
end $$;