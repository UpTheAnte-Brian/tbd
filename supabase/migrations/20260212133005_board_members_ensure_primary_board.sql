begin;

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