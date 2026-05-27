begin;

-- Supabase lint 0010: views in exposed schemas must not run with owner rights.
-- SECURITY INVOKER makes permissions and RLS resolve as the querying role.
alter view public.v_district_scope_nonprofits
  set (security_invoker = true);

alter view public.superintendent_scope_nonprofits_ready
  set (security_invoker = true);

alter view public.v_entity_best_geocode
  set (security_invoker = true);

alter view public.entity_donation_totals
  set (security_invoker = true);

alter view governance.meeting_minutes_expanded
  set (security_invoker = true);

alter view public.user_profiles_with_roles
  set (security_invoker = true);

comment on view public.entity_donation_totals is
'Aggregate donation totals. Uses SECURITY INVOKER so base donations RLS applies to the querying role.';

-- Supabase lint 0013: exposed public tables need RLS enabled.
alter table public.entity_person_roles enable row level security;
alter table public.entity_user_invites enable row level security;

grant select, insert, update, delete on public.entity_person_roles to authenticated;
grant select, insert, update, delete on public.entity_user_invites to authenticated;

drop policy if exists entity_person_roles_select_entity_admin on public.entity_person_roles;
create policy entity_person_roles_select_entity_admin
on public.entity_person_roles
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
  or linked_user_id = auth.uid()
);

drop policy if exists entity_person_roles_insert_entity_admin on public.entity_person_roles;
create policy entity_person_roles_insert_entity_admin
on public.entity_person_roles
for insert
to authenticated
with check (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

drop policy if exists entity_person_roles_update_entity_admin on public.entity_person_roles;
create policy entity_person_roles_update_entity_admin
on public.entity_person_roles
for update
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
)
with check (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

drop policy if exists entity_person_roles_delete_entity_admin on public.entity_person_roles;
create policy entity_person_roles_delete_entity_admin
on public.entity_person_roles
for delete
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

drop policy if exists entity_user_invites_select_entity_admin_or_invitee on public.entity_user_invites;
create policy entity_user_invites_select_entity_admin_or_invitee
on public.entity_user_invites
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists entity_user_invites_insert_entity_admin on public.entity_user_invites;
create policy entity_user_invites_insert_entity_admin
on public.entity_user_invites
for insert
to authenticated
with check (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

drop policy if exists entity_user_invites_update_entity_admin_or_invitee on public.entity_user_invites;
create policy entity_user_invites_update_entity_admin_or_invitee
on public.entity_user_invites
for update
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists entity_user_invites_delete_entity_admin on public.entity_user_invites;
create policy entity_user_invites_delete_entity_admin
on public.entity_user_invites
for delete
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

commit;
