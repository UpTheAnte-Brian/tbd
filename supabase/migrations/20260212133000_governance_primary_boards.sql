begin;

alter table governance.boards
  add column if not exists is_primary boolean not null default true;

update governance.boards
set is_primary = true
where entity_id is not null
  and is_primary is distinct from true;

update governance.boards
set name = 'Board of Directors'
where entity_id is not null
  and (name is null or btrim(name) = '');

create unique index if not exists boards_one_primary_per_entity_uniq
  on governance.boards(entity_id)
  where entity_id is not null and is_primary = true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'boards_entity_id_fk'
      and conrelid = 'governance.boards'::regclass
  ) then
    alter table governance.boards
      add constraint boards_entity_id_fk
      foreign key (entity_id) references public.entities(id) on delete cascade;
  end if;
end $$;

create or replace function governance.ensure_primary_board(p_entity_id uuid)
returns uuid
language plpgsql
security definer
set search_path = governance, public
as $$
declare
  v_board_id uuid;
begin
  if p_entity_id is null then
    return null;
  end if;

  select b.id into v_board_id
  from governance.boards b
  where b.entity_id = p_entity_id
    and b.is_primary = true
  limit 1;

  if v_board_id is not null then
    return v_board_id;
  end if;

  insert into governance.boards (entity_id, name, is_primary)
  values (p_entity_id, 'Board of Directors', true)
  on conflict do nothing
  returning id into v_board_id;

  if v_board_id is null then
    select b.id into v_board_id
    from governance.boards b
    where b.entity_id = p_entity_id
      and b.is_primary = true
    limit 1;
  end if;

  return v_board_id;
end;
$$;

create or replace function public.tg_entity_users_ensure_primary_board()
returns trigger
language plpgsql
as $$
declare
  v_entity_type text;
begin
  if new.role <> 'admin' then
    return new;
  end if;

  select e.entity_type into v_entity_type
  from public.entities e
  where e.id = new.entity_id;

  if v_entity_type <> 'nonprofit' then
    return new;
  end if;

  perform governance.ensure_primary_board(new.entity_id);

  return new;
end;
$$;

drop trigger if exists entity_users_ensure_primary_board on public.entity_users;
create trigger entity_users_ensure_primary_board
after insert on public.entity_users
for each row
execute function public.tg_entity_users_ensure_primary_board();

drop trigger if exists entity_users_ensure_primary_board_on_update on public.entity_users;
create trigger entity_users_ensure_primary_board_on_update
after update of role on public.entity_users
for each row
when (new.role = 'admin' and old.role is distinct from new.role)
execute function public.tg_entity_users_ensure_primary_board();

insert into governance.boards (entity_id, name, is_primary)
select distinct eu.entity_id, 'Board of Directors', true
from public.entity_users eu
join public.entities e on e.id = eu.entity_id
left join governance.boards b
  on b.entity_id = eu.entity_id
  and b.is_primary = true
where eu.role = 'admin'
  and e.entity_type = 'nonprofit'
  and b.id is null
on conflict do nothing;

create or replace function governance.tg_board_members_ensure_primary_board()
returns trigger
language plpgsql
as $$
declare
  v_entity_id uuid;
  v_entity_type text;
begin
  -- derive entity_id from the board
  select b.entity_id into v_entity_id
  from governance.boards b
  where b.id = new.board_id;

  if v_entity_id is null then
    return new;
  end if;

  select e.entity_type into v_entity_type
  from public.entities e
  where e.id = v_entity_id;

  -- only auto-create for nonprofits
  if v_entity_type <> 'nonprofit' then
    return new;
  end if;

  perform governance.ensure_primary_board(v_entity_id);

  return new;
end;
$$;

drop trigger if exists board_members_ensure_primary_board on governance.board_members;
create trigger board_members_ensure_primary_board
after insert on governance.board_members
for each row
execute function governance.tg_board_members_ensure_primary_board();

commit;
