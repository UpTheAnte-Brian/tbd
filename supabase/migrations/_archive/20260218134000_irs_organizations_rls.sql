alter table irs.organizations enable row level security;

drop policy if exists "authenticated can read irs organizations" on irs.organizations;

create policy "authenticated can read irs organizations"
on irs.organizations
for select
to authenticated
using (true);

grant usage on schema irs to authenticated;
grant select on table irs.organizations to authenticated;
