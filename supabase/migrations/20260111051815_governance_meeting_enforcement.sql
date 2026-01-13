-- ============================================================
-- Governance: Meeting lifecycle + immutability enforcement
-- - Call/start meeting
-- - Adjourn meeting
-- - Lock votes after adjournment
-- - Make finalized minutes immutable (amend via new version)
-- ============================================================

create schema if not exists governance;

-- ----------------------------
-- 1) Enums (adjust if you already have these)
-- ----------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'meeting_status' and typnamespace = 'governance'::regnamespace) then
    create type governance.meeting_status as enum ('scheduled','in_session','adjourned','cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'minutes_status' and typnamespace = 'governance'::regnamespace) then
    create type governance.minutes_status as enum ('draft','finalized','amended');
  end if;
end $$;

-- ----------------------------
-- 2) Helper: current user id
-- ----------------------------
create or replace function governance.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

-- ----------------------------
-- 3) Helper: is board member (adjust table/columns to match your schema)
-- Assumes: governance.board_members(board_id, user_id, role, term_start, term_end)
-- ----------------------------
-- IMPORTANT:
-- This function is referenced by RLS policies in some environments.
-- Do NOT DROP it in migrations.
-- Also, do NOT change its argument list, argument names, or defaults once created.
--
-- To keep this migration replay-safe across environments, we ONLY create the function
-- if it does not already exist.
DO $do$
BEGIN
  -- Use to_regprocedure for a reliable existence check across environments.
  IF to_regprocedure('governance.is_board_member(uuid,uuid)') IS NULL THEN
    EXECUTE $fn$
      create function governance.is_board_member(p_board_id uuid, p_user_id uuid)
      returns boolean
      language plpgsql
      stable
      as $plpgsql$
      begin
        -- If the table isn't present in this environment yet, treat as not a member.
        if to_regclass('governance.board_members') is null then
          return false;
        end if;

        return exists (
          select 1
          from governance.board_members bm
          where bm.board_id = p_board_id
            and bm.user_id = p_user_id
            -- term bounds cover most cases; some envs may not have an `active` column
            and (bm.term_start is null or bm.term_start <= now())
            and (bm.term_end   is null or bm.term_end   >= now())
        );
      end;
      $plpgsql$;
    $fn$;
  END IF;
END $do$;

-- Convenience wrapper (safe to add/change later)
create or replace function governance.is_board_member_current(p_board_id uuid)
returns boolean
language sql
stable
as $$
  select governance.is_board_member(p_board_id, auth.uid());
$$;

-- ----------------------------
-- 4) Helper: is board officer (chair/vice/secretary/etc)
-- Assumes board_members.role contains officer-ish values.
-- Adjust role list to match your enums.
-- ----------------------------
-- IMPORTANT:
-- This function may be referenced by RLS policies in some environments.
-- Do NOT DROP it in migrations.
-- Do NOT change its argument list, argument names, or defaults once created.
--
-- To keep this migration replay-safe across environments, we ONLY create the function
-- if it does not already exist.
DO $do$
BEGIN
  -- Use to_regprocedure for a reliable existence check across environments.
  IF to_regprocedure('governance.is_board_officer(uuid,uuid)') IS NULL THEN
    EXECUTE $fn$
      create function governance.is_board_officer(p_board_id uuid, p_user_id uuid)
      returns boolean
      language plpgsql
      stable
      as $plpgsql$
      begin
        -- If the table isn't present in this environment yet, treat as not an officer.
        if to_regclass('governance.board_members') is null then
          return false;
        end if;

        return exists (
          select 1
          from governance.board_members bm
          where bm.board_id = p_board_id
            and bm.user_id = p_user_id
            and (bm.term_start is null or bm.term_start <= now())
            and (bm.term_end   is null or bm.term_end   >= now())
            and bm.role in ('chair','vice_chair','president','secretary')
        );
      end;
      $plpgsql$;
    $fn$;
  END IF;
END $do$;

-- Convenience wrapper (safe to add/change later)
create or replace function governance.is_board_officer_current(p_board_id uuid)
returns boolean
language sql
stable
as $$
  select governance.is_board_officer(p_board_id, auth.uid());
$$;

-- ----------------------------
-- 5) Rules: who may call/adjourn
-- You can evolve this into a per-board rules table later.
-- For now:
--   - call/start: officer OR any board member (choose strictness below)
--   - adjourn: presiding officer OR any officer OR majority vote (vote part later)
-- ----------------------------
create or replace function governance.assert_can_start_meeting(p_board_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_uid uuid := governance.current_user_id();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- STRICT (officers only):
  -- if not governance.is_board_officer(p_board_id, v_uid) then
  --   raise exception 'Only an officer may start/call this meeting' using errcode = '42501';
  -- end if;

  -- DEFAULT (officer OR any board member):
  if not governance.is_board_officer(p_board_id, v_uid)
     and not governance.is_board_member(p_board_id, v_uid) then
    raise exception 'Only a board member may start/call this meeting' using errcode = '42501';
  end if;
end $$;

create or replace function governance.assert_can_adjourn_meeting(p_board_id uuid, p_presiding_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_uid uuid := governance.current_user_id();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Presiding officer can always adjourn
  if p_presiding_user_id is not null and v_uid = p_presiding_user_id then
    return;
  end if;

  -- Otherwise allow any officer
  if governance.is_board_officer(p_board_id, v_uid) then
    return;
  end if;

  -- Later enhancement: allow majority vote to adjourn (requires recorded motion/vote)
  raise exception 'Only the presiding officer (or an officer) may adjourn this meeting' using errcode = '42501';
end $$;

-- ----------------------------
-- 6) Meeting lifecycle enforcement trigger
-- Assumes: governance.board_meetings(id, board_id, status, started_at, adjourned_at, presiding_user_id, called_by_user_id)
-- ----------------------------
create or replace function governance.trg_board_meetings_enforce_lifecycle()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Prevent status regressions / invalid transitions
  if tg_op = 'UPDATE' then
    if old.status = 'adjourned' and new.status <> 'adjourned' then
      raise exception 'Cannot change an adjourned meeting' using errcode = '23514';
    end if;
    if old.status = 'cancelled' and new.status <> 'cancelled' then
      raise exception 'Cannot change a cancelled meeting' using errcode = '23514';
    end if;
  end if;

  -- Start meeting (scheduled -> in_session)
  if (tg_op = 'UPDATE' or tg_op = 'INSERT') then
    if new.status = 'in_session' and coalesce(old.status,'scheduled') <> 'in_session' then
      -- Only allow from scheduled
      if old.status is not null and old.status <> 'scheduled' then
        raise exception 'Meeting can only enter session from scheduled status' using errcode = '23514';
      end if;

      perform governance.assert_can_start_meeting(new.board_id);

      if new.started_at is null then
        new.started_at := now();
      end if;

      if new.called_by_user_id is null then
        new.called_by_user_id := governance.current_user_id();
      end if;

      if new.presiding_user_id is null then
        -- reasonable default: whoever started it
        new.presiding_user_id := governance.current_user_id();
      end if;
    end if;

    -- Adjourn meeting (in_session -> adjourned)
    if new.status = 'adjourned' and coalesce(old.status,'scheduled') <> 'adjourned' then
      if old.status <> 'in_session' then
        raise exception 'Meeting can only be adjourned from in_session status' using errcode = '23514';
      end if;

      perform governance.assert_can_adjourn_meeting(new.board_id, new.presiding_user_id);

      if new.adjourned_at is null then
        new.adjourned_at := now();
      end if;
    end if;
  end if;

  return new;
end $$;

do $$
begin
  if to_regclass('governance.board_meetings') is null then
    raise notice 'Skipping board_meetings_enforce_lifecycle trigger; governance.board_meetings does not exist.';
  else
    execute 'drop trigger if exists board_meetings_enforce_lifecycle on governance.board_meetings';
    execute 'create trigger board_meetings_enforce_lifecycle before insert or update on governance.board_meetings for each row execute function governance.trg_board_meetings_enforce_lifecycle()';
  end if;
end $$;

-- 7) Votes become immutable at adjournment
-- Assumes:
--   governance.motions(id, meeting_id, status, finalized_at)
--   governance.votes(id, motion_id, user_id, vote_value, created_at)
--   governance.board_meetings(id, status)
-- This version is replay-safe if motions/board_meetings do not exist.
create or replace function governance.meeting_is_adjourned_for_motion(p_motion_id uuid)
returns boolean
language plpgsql
stable
as $$
begin
  -- If the required tables aren't present in this environment yet, treat as not adjourned.
  if to_regclass('governance.motions') is null
     or to_regclass('governance.board_meetings') is null then
    return false;
  end if;

  return exists (
    select 1
    from governance.motions m
    join governance.board_meetings bm on bm.id = m.meeting_id
    where m.id = p_motion_id
      and bm.status::text = 'adjourned'
  );
end;
$$;

create or replace function governance.trg_votes_block_after_adjournment()
returns trigger
language plpgsql
security definer
as $$
begin
  if governance.meeting_is_adjourned_for_motion(new.motion_id) then
    raise exception 'Votes are immutable after meeting adjournment' using errcode = '23514';
  end if;
  return new;
end $$;

do $$
begin
  if to_regclass('governance.votes') is null then
    raise notice 'Skipping votes_block_after_adjournment trigger; governance.votes does not exist.';
  else
    execute 'drop trigger if exists votes_block_after_adjournment on governance.votes';
    execute 'create trigger votes_block_after_adjournment before insert or update or delete on governance.votes for each row execute function governance.trg_votes_block_after_adjournment()';
  end if;
end $$;

-- ----------------------------
-- 8) Minutes versioning: finalized minutes are immutable
-- Assumes a minutes table:
--   governance.meeting_minutes(
--     id uuid,
--     meeting_id uuid,
--     version int,
--     status governance.minutes_status,
--     content jsonb or text,
--     finalized_at timestamptz,
--     finalized_by_user_id uuid,
--     amended_from_minutes_id uuid null
--   )
-- Rules:
--   - status=finalized cannot be updated (content, etc.)
--   - amendments require INSERT of a new row with status=amended and amended_from_minutes_id set
-- ----------------------------
create or replace function governance.trg_minutes_immutable_if_finalized()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status = 'finalized' then
      raise exception 'Finalized minutes are immutable; create an amended version instead' using errcode = '23514';
    end if;
  end if;

  -- When finalizing, stamp metadata
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    if new.status = 'finalized' and coalesce(old.status,'draft') <> 'finalized' then
      if new.finalized_at is null then
        new.finalized_at := now();
      end if;
      if new.finalized_by_user_id is null then
        new.finalized_by_user_id := governance.current_user_id();
      end if;
    end if;
  end if;

  return new;
end $$;

do $$
begin
  if to_regclass('governance.meeting_minutes') is null then
    raise notice 'Skipping minutes_immutable_if_finalized trigger; governance.meeting_minutes does not exist.';
  else
    execute 'drop trigger if exists minutes_immutable_if_finalized on governance.meeting_minutes';
    execute 'create trigger minutes_immutable_if_finalized before insert or update on governance.meeting_minutes for each row execute function governance.trg_minutes_immutable_if_finalized()';
  end if;
end $$;

-- Optional: enforce version increments per meeting
create or replace function governance.trg_minutes_auto_version()
returns trigger
language plpgsql
security definer
as $$
declare
  v_max int;
begin
  if tg_op = 'INSERT' then
    if new.version is null then
      select coalesce(max(mm.version), 0) into v_max
      from governance.meeting_minutes mm
      where mm.meeting_id = new.meeting_id;

      new.version := v_max + 1;
    end if;
  end if;

  return new;
end $$;

do $$
begin
  if to_regclass('governance.meeting_minutes') is null then
    raise notice 'Skipping minutes_auto_version trigger; governance.meeting_minutes does not exist.';
  else
    execute 'drop trigger if exists minutes_auto_version on governance.meeting_minutes';
    execute 'create trigger minutes_auto_version before insert on governance.meeting_minutes for each row execute function governance.trg_minutes_auto_version()';
  end if;
end $$;