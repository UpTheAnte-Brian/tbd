-- Grant IRS schema/table access for authenticated users + RLS for entity links

grant usage on schema irs to authenticated;

grant select on table irs.organizations to authenticated;
grant select, insert, update, delete on table irs.entity_links to authenticated;
grant select on table irs.latest_returns to authenticated;
grant select on table irs.latest_financials to authenticated;

-- Wrapper for governance.can_read_entity to align with policy expectations
create or replace function public.can_read_entity(p_entity_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select governance.can_read_entity(p_entity_id, p_user_id);
$$;

grant execute on function public.can_read_entity(uuid, uuid) to authenticated;

alter table irs.entity_links enable row level security;

drop policy if exists "entity admins can manage irs links" on irs.entity_links;
create policy "entity admins can manage irs links"
on irs.entity_links
for all
using (public.can_read_entity(entity_id, auth.uid()))
with check (public.can_read_entity(entity_id, auth.uid()));
