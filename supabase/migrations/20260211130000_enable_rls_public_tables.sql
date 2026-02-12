begin;

-- Enable RLS on tables that currently have it disabled.
alter table public.businesses enable row level security;
alter table public.district_metadata enable row level security;
alter table public.donations enable row level security;
alter table public.entities enable row level security;
alter table public.entity_address_geocodes enable row level security;
alter table public.entity_addresses enable row level security;
alter table public.entity_attributes enable row level security;
alter table public.entity_geometries enable row level security;
alter table public.entity_relationships enable row level security;
alter table public.entity_source_records enable row level security;
alter table public.entity_status enable row level security;
alter table public.entity_types enable row level security;
alter table public.mde_org_types enable row level security;
alter table public.mde_school_class_types enable row level security;
alter table public.mde_states enable row level security;
alter table public.school_program_location_metadata enable row level security;
alter table public.subscriptions enable row level security;

-- GRANTS: baseline for “public read” tables (public schema can be public reads),
-- EXCEPT donations/subscriptions which are treated specially in the policies migration.
grant select on public.businesses to anon, authenticated;
grant select on public.district_metadata to anon, authenticated;
grant select on public.entities to anon, authenticated;
grant select on public.entity_address_geocodes to anon, authenticated;
grant select on public.entity_addresses to anon, authenticated;
grant select on public.entity_attributes to anon, authenticated;
grant select on public.entity_geometries to anon, authenticated;
grant select on public.entity_relationships to anon, authenticated;
grant select on public.entity_source_records to anon, authenticated;
grant select on public.entity_status to anon, authenticated;
grant select on public.entity_types to anon, authenticated;
grant select on public.mde_org_types to anon, authenticated;
grant select on public.mde_school_class_types to anon, authenticated;
grant select on public.mde_states to anon, authenticated;
grant select on public.school_program_location_metadata to anon, authenticated;

-- Writes: authenticated only (actual permission is still enforced by RLS policies).
grant insert, update, delete on public.businesses to authenticated;
grant insert, update, delete on public.district_metadata to authenticated;
grant insert, update, delete on public.entities to authenticated;
grant insert, update, delete on public.entity_address_geocodes to authenticated;
grant insert, update, delete on public.entity_addresses to authenticated;
grant insert, update, delete on public.entity_attributes to authenticated;
grant insert, update, delete on public.entity_geometries to authenticated;
grant insert, update, delete on public.entity_relationships to authenticated;
grant insert, update, delete on public.entity_source_records to authenticated;
grant insert, update, delete on public.entity_status to authenticated;
grant insert, update, delete on public.entity_types to authenticated;
grant insert, update, delete on public.school_program_location_metadata to authenticated;

-- Donations/subscriptions: do NOT grant public SELECT.
-- Insert allowed for anon + authenticated (per requirements).
grant insert on public.donations to anon, authenticated;
grant select, update, delete on public.donations to authenticated;

grant insert on public.subscriptions to anon, authenticated;
grant select, update, delete on public.subscriptions to authenticated;

commit;
