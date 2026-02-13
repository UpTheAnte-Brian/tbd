begin;

alter table public.entity_users
  add column if not exists is_primary_admin boolean not null default false;

create unique index if not exists entity_users_one_primary_admin_per_entity_uniq
  on public.entity_users(entity_id)
  where is_primary_admin = true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'entity_users_primary_admin_requires_admin_role_chk'
      and conrelid = 'public.entity_users'::regclass
  ) then
    alter table public.entity_users
      add constraint entity_users_primary_admin_requires_admin_role_chk
      check (is_primary_admin = false or role = 'admin');
  end if;
end $$;

with ranked as (
  select
    id,
    entity_id,
    row_number() over (partition by entity_id order by created_at asc, id asc) as rn
  from public.entity_users
  where role = 'admin'
),
entities_missing as (
  select eu.entity_id
  from public.entity_users eu
  group by eu.entity_id
  having sum(case when eu.is_primary_admin then 1 else 0 end) = 0
)
update public.entity_users eu
set is_primary_admin = true
from ranked r
join entities_missing m on m.entity_id = r.entity_id
where eu.id = r.id
  and r.rn = 1;

commit;
