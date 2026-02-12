begin;

-- Generic public-read + admin-write policies for public tables that have no policies.
do $$
declare
  tbl text;
  has_policies boolean;
  has_entity_id boolean;
  has_district_entity_id boolean;
  using_expr text;
begin
  foreach tbl in array ARRAY[
    'businesses',
    'district_metadata',
    'entities',
    'entity_address_geocodes',
    'entity_addresses',
    'entity_attributes',
    'entity_geometries',
    'entity_relationships',
    'entity_source_records',
    'entity_status',
    'entity_types',
    'mde_org_types',
    'mde_school_class_types',
    'mde_states',
    'school_program_location_metadata'
  ]
  loop
    select exists(
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
    ) into has_policies;

    if has_policies then
      continue;
    end if;

    execute format(
      'create policy %I_select_public on public.%I for select to anon, authenticated using (true);',
      tbl,
      tbl
    );

    select exists(
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = tbl
        and column_name = 'entity_id'
    ) into has_entity_id;

    select exists(
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = tbl
        and column_name = 'district_entity_id'
    ) into has_district_entity_id;

    if has_entity_id then
      using_expr := 'public.is_entity_admin(entity_id) or public.is_global_admin(auth.uid())';
    elsif has_district_entity_id then
      using_expr := 'public.is_entity_admin(district_entity_id) or public.is_global_admin(auth.uid())';
    else
      using_expr := 'public.is_global_admin(auth.uid())';
    end if;

    execute format(
      'create policy %I_write_admin on public.%I for all to authenticated using (%s) with check (%s);',
      tbl,
      tbl,
      using_expr,
      using_expr
    );
  end loop;
end $$;

-- Donations (custom, private-by-default)
drop policy if exists donations_insert_any on public.donations;
create policy donations_insert_any
on public.donations
for insert
to anon, authenticated
with check (true);

drop policy if exists donations_select_self on public.donations;
create policy donations_select_self
on public.donations
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists donations_select_admin on public.donations;
create policy donations_select_admin
on public.donations
for select
to authenticated
using (
  (entity_id is not null and public.is_entity_admin(entity_id))
  or public.is_global_admin(auth.uid())
);

drop policy if exists donations_update_admin on public.donations;
create policy donations_update_admin
on public.donations
for update
to authenticated
using (
  (entity_id is not null and public.is_entity_admin(entity_id))
  or public.is_global_admin(auth.uid())
)
with check (
  (entity_id is not null and public.is_entity_admin(entity_id))
  or public.is_global_admin(auth.uid())
);

drop policy if exists donations_delete_admin on public.donations;
create policy donations_delete_admin
on public.donations
for delete
to authenticated
using (
  (entity_id is not null and public.is_entity_admin(entity_id))
  or public.is_global_admin(auth.uid())
);

-- Public aggregate view (safe, no donor fields)
create or replace view public.entity_donation_totals
-- Intentionally owner-rights so anon can see aggregates without base-table access.
with (security_invoker = false) as
select
  entity_id,
  count(*) as donation_count,
  sum(amount) as total_amount,
  min(created_at) as first_donation_at,
  max(created_at) as last_donation_at
from public.donations
where entity_id is not null
group by entity_id;

comment on view public.entity_donation_totals is
'Public aggregate; intentionally not security_invoker so anon can read totals without donations row access.';

grant select on public.entity_donation_totals to anon, authenticated;

-- Subscriptions (custom)
drop policy if exists subscriptions_insert_any on public.subscriptions;
create policy subscriptions_insert_any
on public.subscriptions
for insert
to anon, authenticated
with check (true);

drop policy if exists subscriptions_select_self on public.subscriptions;
create policy subscriptions_select_self
on public.subscriptions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists subscriptions_select_admin on public.subscriptions;
create policy subscriptions_select_admin
on public.subscriptions
for select
to authenticated
using (
  (entity_id is not null and public.is_entity_admin(entity_id))
  or public.is_global_admin(auth.uid())
);

drop policy if exists subscriptions_update_admin on public.subscriptions;
create policy subscriptions_update_admin
on public.subscriptions
for update
to authenticated
using (
  (entity_id is not null and public.is_entity_admin(entity_id))
  or public.is_global_admin(auth.uid())
)
with check (
  (entity_id is not null and public.is_entity_admin(entity_id))
  or public.is_global_admin(auth.uid())
);

drop policy if exists subscriptions_delete_admin on public.subscriptions;
create policy subscriptions_delete_admin
on public.subscriptions
for delete
to authenticated
using (
  (entity_id is not null and public.is_entity_admin(entity_id))
  or public.is_global_admin(auth.uid())
);

commit;
