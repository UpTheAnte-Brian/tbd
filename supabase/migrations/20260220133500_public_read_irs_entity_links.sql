begin;

-- District dashboard and entity tab metadata need IRS link lookups for anon users.
grant usage on schema irs to anon, authenticated;
grant select on table irs.entity_links to anon, authenticated;

drop policy if exists irs_entity_links_public_read on irs.entity_links;
create policy irs_entity_links_public_read
on irs.entity_links
for select
to anon, authenticated
using (true);

commit;
