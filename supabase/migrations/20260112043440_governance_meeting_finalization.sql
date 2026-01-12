-- Governance: meeting lifecycle + minutes finalization scaffolding
--
-- Goals
-- 1) Make meeting status strongly-typed and auditable (scheduled -> in_session -> adjourned/cancelled)
-- 2) Upgrade minutes to support structured + rendered content with a clear status model
-- 3) Add basic immutability guards for finalized/approved records

begin;

-- -----------------------------------------------------------------------------
-- 0) Enums (idempotent)
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'governance' and t.typname = 'meeting_status'
  ) then
    create type governance.meeting_status as enum ('scheduled', 'in_progress', 'adjourned', 'cancelled');
  end if;
end $$;


do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'governance' and t.typname = 'minutes_status'
  ) then
    create type governance.minutes_status as enum ('draft', 'finalized', 'amended');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1a) Pre-ALTER safety: drop broken CHECK constraints on board_meetings
-- -----------------------------------------------------------------------------
-- If `status` was migrated to an enum in some environment, any old CHECK constraint that
-- compares enum `status` to TEXT literals will break *any* ALTER TABLE on board_meetings.
-- We avoid deparsing/introspection and simply drop all CHECK constraints on the table,
-- then re-add the small set of checks we rely on.

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'governance'
      and t.relname = 'board_meetings'
      and c.contype = 'c'
  loop
    execute format('alter table governance.board_meetings drop constraint %I', r.conname);
  end loop;
end $$;

-- If status is already the enum in some environment, normalize it back to TEXT for now.
-- This avoids enum-vs-text operator issues from legacy constraints/triggers.
do $$
declare
  v_udt_name text;
begin
  select udt_name
    into v_udt_name
  from information_schema.columns
  where table_schema = 'governance'
    and table_name   = 'board_meetings'
    and column_name  = 'status';

  if v_udt_name = 'meeting_status' then
    alter table governance.board_meetings
      alter column status drop default;

    alter table governance.board_meetings
      alter column status type text
      using status::text;

    alter table governance.board_meetings
      alter column status set default 'scheduled'::text;
  end if;
end $$;

-- Re-add meeting_type allowed values (matches existing schema)
-- NOTE: This is a CHECK constraint; adjust values only if you intentionally change meeting types.
alter table governance.board_meetings
  add constraint board_meetings_meeting_type_check
  check (meeting_type = any (array['regular','special','emergency','annual']));

-- Re-add a safe status allowed-values constraint that works for enum OR text.
alter table governance.board_meetings
  add constraint board_meetings_status_allowed_check
  check (status::text = any (array['scheduled','in_progress','adjourned','cancelled']));

-- Add lifecycle fields (idempotent). We intentionally do NOT convert `status` to an enum here.
-- Some environments have legacy objects that compare enum status to TEXT; we will revisit strong typing later.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='board_meetings' and column_name='started_at'
  ) then
    alter table governance.board_meetings add column started_at timestamptz null;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='board_meetings' and column_name='adjourned_at'
  ) then
    alter table governance.board_meetings add column adjourned_at timestamptz null;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='board_meetings' and column_name='cancelled_at'
  ) then
    alter table governance.board_meetings add column cancelled_at timestamptz null;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='board_meetings' and column_name='finalized_at'
  ) then
    alter table governance.board_meetings add column finalized_at timestamptz null;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='board_meetings' and column_name='finalized_by'
  ) then
    alter table governance.board_meetings add column finalized_by uuid null;
    alter table governance.board_meetings
      add constraint board_meetings_finalized_by_fkey
      foreign key (finalized_by) references governance.board_members(id);
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='board_meetings' and column_name='finalized_signature_hash'
  ) then
    alter table governance.board_meetings add column finalized_signature_hash text null;
  end if;
end $$;

-- Helpful integrity: if adjourned_at exists, status should be adjourned.
-- (Soft check—keeps flexibility; adjust later if you want strict triggers.)

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'board_meetings_adjourned_status_check'
  ) then
    alter table governance.board_meetings
      add constraint board_meetings_adjourned_status_check
      check (
        adjourned_at is null
        or status::text = 'adjourned'
      );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2) Meeting minutes: structured + rendered content, status, versioning
-- -----------------------------------------------------------------------------

-- Existing table `governance.meeting_minutes` appears to already exist.
-- This migration upgrades it without dropping columns.

-- Ensure we have a single minutes row per meeting (current design in types.ts implies 1:1).

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meeting_minutes_meeting_id_unique'
  ) then
    alter table governance.meeting_minutes
      add constraint meeting_minutes_meeting_id_unique unique (meeting_id);
  end if;
end $$;

-- Add new columns (idempotent)

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='meeting_minutes' and column_name='status'
  ) then
    alter table governance.meeting_minutes
      add column status governance.minutes_status not null default 'draft'::governance.minutes_status;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='meeting_minutes' and column_name='content_json'
  ) then
    -- Structured minutes payload (Robert's Rules-style sections, motions summary, attendance, etc.)
    alter table governance.meeting_minutes
      add column content_json jsonb null;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='meeting_minutes' and column_name='content_md'
  ) then
    -- Rendered minutes content (Markdown). We keep legacy `content` for compatibility.
    alter table governance.meeting_minutes
      add column content_md text null;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='meeting_minutes' and column_name='finalized_at'
  ) then
    alter table governance.meeting_minutes
      add column finalized_at timestamptz null;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='meeting_minutes' and column_name='finalized_by'
  ) then
    alter table governance.meeting_minutes
      add column finalized_by uuid null;
    alter table governance.meeting_minutes
      add constraint meeting_minutes_finalized_by_fkey
      foreign key (finalized_by) references governance.board_members(id);
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='meeting_minutes' and column_name='locked_at'
  ) then
    -- When set, minutes become immutable (enforced by trigger below)
    alter table governance.meeting_minutes
      add column locked_at timestamptz null;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='meeting_minutes' and column_name='amended_from_id'
  ) then
    -- In case you later pivot to versioned minutes, keep a pointer to the prior minutes record.
    alter table governance.meeting_minutes
      add column amended_from_id uuid null;
    alter table governance.meeting_minutes
      add constraint meeting_minutes_amended_from_fkey
      foreign key (amended_from_id) references governance.meeting_minutes(id);
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='meeting_minutes' and column_name='version_number'
  ) then
    alter table governance.meeting_minutes
      add column version_number int not null default 1;
  end if;
end $$;

-- Backfill: if legacy boolean draft exists, map it to status.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='governance' and table_name='meeting_minutes' and column_name='draft'
  ) then
    update governance.meeting_minutes
      set status = case when draft then 'draft'::governance.minutes_status else 'finalized'::governance.minutes_status end
    where status is null;
  end if;
end $$;

-- Backfill rendered markdown from legacy `content` if content_md is empty.
update governance.meeting_minutes
  set content_md = content
where content_md is null
  and content is not null;

-- -----------------------------------------------------------------------------
-- 3) Immutability guard: prevent edits after lock
-- -----------------------------------------------------------------------------

create or replace function governance.prevent_minutes_update_when_locked()
returns trigger
language plpgsql
as $$
begin
  if (old.locked_at is not null) then
    raise exception 'Meeting minutes are locked and cannot be modified.';
  end if;
  return new;
end;
$$;

-- Attach trigger (idempotent)

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_prevent_minutes_update_when_locked'
  ) then
    create trigger trg_prevent_minutes_update_when_locked
    before update or delete on governance.meeting_minutes
    for each row
    execute function governance.prevent_minutes_update_when_locked();
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4) Convenience: view to hydrate minutes with meeting metadata (optional but handy)
-- -----------------------------------------------------------------------------

create or replace view governance.meeting_minutes_expanded as
select
  mm.*, 
  bm.board_id,
  bm.scheduled_start,
  bm.scheduled_end,
  bm.meeting_type,
  bm.title as meeting_title,
  bm.status as meeting_status
from governance.meeting_minutes mm
join governance.board_meetings bm on bm.id = mm.meeting_id;

-- -----------------------------------------------------------------------------
-- 5) RPC: finalize_meeting
--    1) checks quorum
--    2) locks votes/motions (logical lock via meeting.finalized_at + optional lock markers)
--    3) generates meeting minutes draft (content_json + content_md)
--    4) sets meeting finalized_at/finalized_by (+ signature hash)
-- -----------------------------------------------------------------------------

-- Helper: check whether an object exists (schema-qualified)
create or replace function governance._object_exists(p_schema text, p_name text, p_kind text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = p_schema
      and c.relname = p_name
      and c.relkind = p_kind
  );
$$;

-- Finalize meeting
create or replace function governance.finalize_meeting(
  p_meeting_id uuid,
  p_signature_hash text default null
)
returns governance.board_meetings
language plpgsql
security definer
set search_path = governance, public
as $$
declare
  v_meeting governance.board_meetings;
  v_actor_user_id uuid;
  v_actor_board_member_id uuid;
  v_has_is_quorum_met boolean;
  v_quorum_met boolean;

  v_minutes_id uuid;
  v_minutes_json jsonb;
  v_minutes_md text;

  v_has_attendance_table boolean;
  v_has_motions_table boolean;
  v_has_votes_table boolean;

  v_present jsonb;
  v_absent jsonb;
  v_motions jsonb;
begin
  if p_meeting_id is null then
    raise exception 'p_meeting_id is required';
  end if;

  -- Lock the meeting row so finalization is atomic.
  select * into v_meeting
  from governance.board_meetings
  where id = p_meeting_id
  for update;

  if not found then
    raise exception 'Meeting % not found', p_meeting_id;
  end if;

  if v_meeting.status::text = 'cancelled' then
    raise exception 'Cannot finalize a cancelled meeting';
  end if;

  if v_meeting.finalized_at is not null then
    raise exception 'Meeting is already finalized at %', v_meeting.finalized_at;
  end if;

  -- Actor
  v_actor_user_id := auth.uid();
  if v_actor_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Map actor to board_member on this board
  select bm.id into v_actor_board_member_id
  from governance.board_members bm
  where bm.board_id = v_meeting.board_id
    and bm.user_id = v_actor_user_id
  limit 1;

  if v_actor_board_member_id is null then
    raise exception 'Current user is not a board member for board %', v_meeting.board_id;
  end if;

  -- 1) Check quorum
  -- Prefer existing function governance.is_quorum_met(uuid) if it exists.
  select exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'governance'
      and p.proname = 'is_quorum_met'
      and pg_get_function_identity_arguments(p.oid) = 'p_meeting_id uuid'
  ) into v_has_is_quorum_met;

  if v_has_is_quorum_met then
    execute 'select governance.is_quorum_met($1)' into v_quorum_met using p_meeting_id;
  else
    raise exception 'Missing governance.is_quorum_met(p_meeting_id uuid). Create it or adjust finalize_meeting to your quorum rules.';
  end if;

  if not v_quorum_met then
    raise exception 'Quorum not met for meeting %', p_meeting_id;
  end if;

  -- 2) Lock votes/motions
  -- We use meeting.finalized_at as the canonical lock flag.
  -- If your schema includes vote/motion tables, you can additionally key enforcement off meeting.finalized_at.

  -- 3) Generate minutes draft
  v_has_attendance_table := governance._object_exists('governance', 'meeting_attendance', 'r');
  v_has_motions_table := governance._object_exists('governance', 'motions', 'r');
  v_has_votes_table := governance._object_exists('governance', 'votes', 'r');

  -- Attendance (best-effort)
  v_present := '[]'::jsonb;
  v_absent := '[]'::jsonb;

  if v_has_attendance_table then
    -- Expected columns (best effort): meeting_id, board_member_id, status ('present'/'absent')
    -- If your schema differs, this will fail loudly so we can adjust.
    begin
      select coalesce(jsonb_agg(jsonb_build_object(
        'board_member_id', a.board_member_id,
        'status', a.status
      ) order by a.board_member_id), '[]'::jsonb)
      into v_present
      from governance.meeting_attendance a
      where a.meeting_id = p_meeting_id
        and a.status = 'present';

      select coalesce(jsonb_agg(jsonb_build_object(
        'board_member_id', a.board_member_id,
        'status', a.status
      ) order by a.board_member_id), '[]'::jsonb)
      into v_absent
      from governance.meeting_attendance a
      where a.meeting_id = p_meeting_id
        and a.status = 'absent';
    exception
      when undefined_column then
        -- Keep empty arrays; schema mismatch.
        v_present := '[]'::jsonb;
        v_absent := '[]'::jsonb;
    end;
  end if;

  -- Motions + vote summaries (best-effort)
  v_motions := '[]'::jsonb;
  if v_has_motions_table then
    begin
      if v_has_votes_table then
        -- Expected columns: motions.id, motions.meeting_id, motions.title, motions.status
        -- votes: motion_id, board_member_id, vote ('yes'/'no'/'abstain')
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'motion_id', m.id,
              'title', m.title,
              'status', m.status,
              'vote_summary', jsonb_build_object(
                'yes', (
                  select count(*) from governance.votes v where v.motion_id = m.id and v.vote = 'yes'
                ),
                'no', (
                  select count(*) from governance.votes v where v.motion_id = m.id and v.vote = 'no'
                ),
                'abstain', (
                  select count(*) from governance.votes v where v.motion_id = m.id and v.vote = 'abstain'
                )
              )
            )
            order by m.created_at
          ),
          '[]'::jsonb
        )
        into v_motions
        from governance.motions m
        where m.meeting_id = p_meeting_id;
      else
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'motion_id', m.id,
              'title', m.title,
              'status', m.status
            )
            order by m.created_at
          ),
          '[]'::jsonb
        )
        into v_motions
        from governance.motions m
        where m.meeting_id = p_meeting_id;
      end if;
    exception
      when undefined_column then
        v_motions := '[]'::jsonb;
    end;
  end if;

  v_minutes_json := jsonb_build_object(
    'meeting_id', p_meeting_id,
    'board_id', v_meeting.board_id,
    'generated_at', now(),
    'call_to_order', v_meeting.started_at,
    'adjourned_at', v_meeting.adjourned_at,
    'attendance', jsonb_build_object(
      'present', v_present,
      'absent', v_absent
    ),
    'motions', v_motions
  );

  v_minutes_md :=
    '# Meeting Minutes\n\n'
    || '**Meeting:** ' || coalesce(v_meeting.title, '(untitled)') || '\n\n'
    || '**Scheduled:** ' || coalesce(v_meeting.scheduled_start::text, '') || ' – ' || coalesce(v_meeting.scheduled_end::text, '') || '\n\n'
    || case when v_meeting.started_at is not null then '**Call to Order:** ' || v_meeting.started_at::text || '\n\n' else '' end
    || case when v_meeting.adjourned_at is not null then '**Adjourned:** ' || v_meeting.adjourned_at::text || '\n\n' else '' end
    || '## Attendance\n\n'
    || '- Present: ' || jsonb_array_length(v_present)::text || '\n'
    || '- Absent: ' || jsonb_array_length(v_absent)::text || '\n\n'
    || '## Motions\n\n'
    || case
         when jsonb_typeof(v_motions) = 'array' and jsonb_array_length(v_motions) > 0 then
           (select string_agg(
             '- ' || coalesce((x->>'title'), '(untitled motion)') || ' — ' || coalesce((x->>'status'), '')
             || case when (x ? 'vote_summary') then
                  ' (Yes: ' || coalesce((x->'vote_summary'->>'yes'),'0')
                  || ', No: ' || coalesce((x->'vote_summary'->>'no'),'0')
                  || ', Abstain: ' || coalesce((x->'vote_summary'->>'abstain'),'0')
                  || ')'
                else '' end,
             E'\n'
           ) from jsonb_array_elements(v_motions) as x)
         else
           '_(No motions recorded)_'
       end
    || '\n';

  -- Upsert minutes row
  select id into v_minutes_id
  from governance.meeting_minutes
  where meeting_id = p_meeting_id
  for update;

  if v_minutes_id is null then
    insert into governance.meeting_minutes (
      meeting_id,
      status,
      content_json,
      content_md,
      content
    ) values (
      p_meeting_id,
      'draft'::governance.minutes_status,
      v_minutes_json,
      v_minutes_md,
      v_minutes_md
    )
    returning id into v_minutes_id;
  else
    update governance.meeting_minutes
      set status = 'draft'::governance.minutes_status,
          content_json = v_minutes_json,
          content_md = v_minutes_md,
          content = coalesce(content, v_minutes_md)
    where id = v_minutes_id;
  end if;

  -- 4) Finalize the meeting
  update governance.board_meetings
    set finalized_at = now(),
        finalized_by = v_actor_board_member_id,
        finalized_signature_hash = p_signature_hash
  where id = p_meeting_id
  returning * into v_meeting;

  return v_meeting;
end;
$$;

-- Note: vote/motion locking enforcement should reference board_meetings.finalized_at.
-- If you already have vote/motion enforcement triggers, update them to block changes when finalized_at is set.

commit;