begin;

create unique index if not exists superintendent_scope_nonprofits_ein_uidx
  on public.superintendent_scope_nonprofits (ein);

drop index if exists superintendent_scope_nonprofits_district_ein_uidx;

alter table public.superintendent_scope_nonprofits enable row level security;

drop policy if exists "Superintendent scope read" on public.superintendent_scope_nonprofits;
create policy "Superintendent scope read"
  on public.superintendent_scope_nonprofits
  for select
  to authenticated
  using (true);

commit;
