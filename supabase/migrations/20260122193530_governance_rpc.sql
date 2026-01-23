-- Governance RPC + helper functions that were present in dev but missing from migrations.
-- These are used by API routes and other governance workflows.

-- Ensure schema exists (safe if already created)

create schema if not exists governance;

-- ------------------------------------------------------------
-- NOTE: Postgres does NOT allow CREATE OR REPLACE to change
-- input-parameter names for an existing function signature.
-- Some environments (test) already had board-scoped param names
-- (e.g. p_board_id) for the (uuid, uuid) and (uuid) overloads.
-- To keep our canonical signatures stable (entity-scoped naming
-- + typegen), we DROP then recreate those overloads.
-- ------------------------------------------------------------

drop function if exists governance.is_board_member(uuid, uuid);
drop function if exists governance.is_board_member(uuid);

-- ------------------------------------------------------------
-- Simple role-check helpers
-- ------------------------------------------------------------

-- Is the given user an active board chair for the entity's board?
create or replace function governance.is_board_chair(
  p_entity_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from governance.boards b
    join governance.board_members bm
      on bm.board_id = b.id
    where b.entity_id = p_entity_id
      and bm.user_id = p_user_id
      and bm.status = 'active'
      and bm.role = 'chair'
      and bm.term_start <= current_date
      and (bm.term_end is null or bm.term_end >= current_date)
  );
$$;

-- Overload: chair check for the current auth user (handy for SQL/RLS + app code).
create or replace function governance.is_board_chair(
  p_entity_id uuid
)
returns boolean
language sql
stable
security invoker
as $$
  select governance.is_board_chair(p_entity_id, auth.uid());
$$;

-- Overload: chair check when you only have a board_id.
create or replace function governance.is_board_chair_for_board(
  p_board_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from governance.board_members bm
    where bm.board_id = p_board_id
      and bm.user_id = p_user_id
      and bm.status = 'active'
      and bm.role = 'chair'
      and bm.term_start <= current_date
      and (bm.term_end is null or bm.term_end >= current_date)
  );
$$;

-- Is the given user an active board member (any role) for the entity's board?
create or replace function governance.is_board_member(
  p_entity_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from governance.boards b
    join governance.board_members bm
      on bm.board_id = b.id
    where b.entity_id = p_entity_id
      and bm.user_id = p_user_id
      and bm.status = 'active'
      and bm.term_start <= current_date
      and (bm.term_end is null or bm.term_end >= current_date)
  );
$$;

-- Overload: member check for the current auth user.
create or replace function governance.is_board_member(
  p_entity_id uuid
)
returns boolean
language sql
stable
security invoker
as $$
  select governance.is_board_member(p_entity_id, auth.uid());
$$;

-- Member check when you only have a board_id.
-- NOTE: We keep the entity-based overload `is_board_member(p_entity_id uuid, p_user_id uuid)` intact.
-- This helper is explicitly board-scoped to avoid signature/name ambiguity.
create or replace function governance.is_board_member_for_board(
  p_board_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from governance.board_members bm
    where bm.board_id = p_board_id
      and bm.user_id = p_user_id
      and bm.status = 'active'
      and bm.term_start <= current_date
      and (bm.term_end is null or bm.term_end >= current_date)
  );
$$;

-- Convenience helper for policy checks where only a board_id is available.
create or replace function governance.is_board_member_current(
  p_board_id uuid
)
returns boolean
language sql
stable
security invoker
as $$
  select governance.is_board_member_for_board(p_board_id, auth.uid());
$$;

-- Is the given user an active officer (any officer role) on the board?
-- NOTE: This assumes `governance.board_members.role` contains officer roles and that 'member'
-- represents a non-officer. Adjust the role list if your enum/text values differ.
create or replace function governance.is_board_officer(
  p_board_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from governance.board_members bm
    where bm.board_id = p_board_id
      and bm.user_id = p_user_id
      and bm.status = 'active'
      and bm.role <> 'member'
      and bm.term_start <= current_date
      and (bm.term_end is null or bm.term_end >= current_date)
  );
$$;

-- Officer check for the current auth user.
create or replace function governance.is_board_officer_current(
  p_board_id uuid
)
returns boolean
language sql
stable
security invoker
as $$
  select governance.is_board_officer(p_board_id, auth.uid());
$$;

-- ------------------------------------------------------------
-- Meeting / motion helpers
-- ------------------------------------------------------------

-- True if quorum has been met for the meeting.
create or replace function governance.is_quorum_met(
  p_meeting_id uuid
)
returns boolean
language plpgsql
stable
security invoker
as $$
declare
  v_required integer;
  v_present integer;
begin
  v_required := governance.quorum_required_for_meeting(p_meeting_id);

  select count(*)
    into v_present
  from governance.meeting_attendance a
  where a.meeting_id = p_meeting_id
    and a.status = 'present';

  return v_present >= v_required;
end;
$$;

-- True if the meeting linked to the motion is adjourned.
create or replace function governance.meeting_is_adjourned_for_motion(
  p_motion_id uuid
)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from governance.motions m
    join governance.board_meetings bm on bm.id = m.meeting_id
    where m.id = p_motion_id
      and bm.status = 'adjourned'
  );
$$;

-- ------------------------------------------------------------
-- Approvals: document version
-- ------------------------------------------------------------

-- Approve a document version, optionally associating the approval to a meeting.
-- Returns the created approval id.
--
-- Parameter notes:
-- - p_document_version_id: required
-- - p_meeting_id: optional meeting context
-- - p_signature_hash: optional signature hash (stored as text)
-- - p_approval_method: optional string, defaults to 'in_app'
-- - p_ip: optional IP address
create or replace function governance.approve_document_version(
  p_document_version_id uuid,
  p_meeting_id uuid default null,
  p_signature_hash text default null,
  p_approval_method text default null,
  p_ip inet default null
)
returns uuid
language plpgsql
security definer
set search_path = governance, public
as $$
declare
  v_entity_id uuid;
  v_board_id uuid;
  v_board_member_id uuid;
  v_approval_id uuid;
  v_now timestamptz := now();
begin
  -- Resolve entity from document_version -> document
  select d.entity_id
    into v_entity_id
  from public.document_versions dv
  join public.documents d on d.id = dv.document_id
  where dv.id = p_document_version_id;

  if v_entity_id is null then
    raise exception 'Document version not found';
  end if;

  -- Auth gate: global admin OR entity admin OR board chair
  if not (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(v_entity_id)
    or governance.is_board_chair(v_entity_id, auth.uid())
  ) then
    raise exception 'Not authorized to approve documents for this entity';
  end if;

  -- If meeting provided, ensure it belongs to this entity (via board)
  if p_meeting_id is not null then
    select mtg.board_id
      into v_board_id
    from governance.board_meetings mtg
    join governance.boards b on b.id = mtg.board_id
    where mtg.id = p_meeting_id
      and b.entity_id = v_entity_id;

    if v_board_id is null then
      raise exception 'Meeting not found or does not belong to this entity';
    end if;
  else
    -- derive a board_id if the entity has one (for board_member resolution)
    select b.id into v_board_id
    from governance.boards b
    where b.entity_id = v_entity_id
    limit 1;
  end if;

  -- Resolve board_member_id (approvals.board_member_id is NOT NULL)
  select bm.id
    into v_board_member_id
  from governance.board_members bm
  where bm.board_id = v_board_id
    and bm.user_id = auth.uid()
    and bm.status = 'active'
    and bm.term_start <= current_date
    and (bm.term_end is null or bm.term_end >= current_date)
  limit 1;

  if v_board_member_id is null then
    raise exception 'Approver must be an active board member for this board';
  end if;

  -- Prevent double approval
  if exists (
    select 1
    from governance.approvals a
    where a.target_type = 'document_version'::governance.approval_target_type
      and a.target_id = p_document_version_id
  ) then
    raise exception 'Document version already approved';
  end if;

  -- Stamp approval on the version
  update public.document_versions
  set approved_at = v_now,
      approved_by = auth.uid(),
      approved_by_meeting_id = p_meeting_id,
      status = 'approved'::public.document_version_status
  where id = p_document_version_id;

  -- Audit row
  insert into governance.approvals (
    entity_id,
    target_type,
    target_id,
    board_member_id,
    approval_method,
    signature_hash,
    ip_address,
    approved_at
  ) values (
    v_entity_id,
    'document_version'::governance.approval_target_type,
    p_document_version_id,
    v_board_member_id,
    coalesce(p_approval_method, 'in_app'),
    coalesce(p_signature_hash, ''),
    p_ip,
    v_now
  )
  returning id into v_approval_id;

  return v_approval_id;
end;
$$;

-- ------------------------------------------------------------
-- Approvals: meeting minutes
-- ------------------------------------------------------------

-- Approve meeting minutes (governance.meeting_minutes) for a given meeting.
-- Returns the created approval id.
--
-- Parameter notes:
-- - p_meeting_id: required
-- - p_signature_hash: optional signature hash (stored as text)
-- - p_approval_method: optional string, defaults to 'in_app'
-- - p_ip: optional IP address
CREATE OR REPLACE FUNCTION governance.approve_meeting_minutes(p_meeting_id uuid, p_signature_hash text DEFAULT NULL::text, p_approval_method text DEFAULT 'in_app'::text, p_ip inet DEFAULT NULL::inet)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_entity_id uuid;
  v_board_id uuid;
  v_minutes_id uuid;
  v_board_member_id uuid;
  v_now timestamptz := now();
  v_approval_id uuid;
begin
  -- derive board + entity from the meeting
  select mtg.board_id, b.entity_id
    into v_board_id, v_entity_id
  from governance.board_meetings mtg
  join governance.boards b on b.id = mtg.board_id
  where mtg.id = p_meeting_id;

  if v_board_id is null or v_entity_id is null then
    raise exception 'Meeting not found or not linked to a board/entity';
  end if;

  -- authorization gate:
  if not (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(v_entity_id)
    or governance.is_board_chair(v_entity_id)
  ) then
    raise exception 'Not authorized to approve minutes for this entity';
  end if;

  -- find minutes row
  select mm.id
    into v_minutes_id
  from governance.meeting_minutes mm
  where mm.meeting_id = p_meeting_id;

  if v_minutes_id is null then
    raise exception 'No minutes exist for meeting %', p_meeting_id;
  end if;

  -- prevent double approval
  if exists (
    select 1 from governance.meeting_minutes mm
    where mm.id = v_minutes_id and mm.approved_at is not null
  ) then
    raise exception 'Minutes already approved for meeting %', p_meeting_id;
  end if;

  -- resolve board_member_id for caller (required unless global admin)
  select bm.id
    into v_board_member_id
  from governance.board_members bm
  where bm.board_id = v_board_id
    and bm.user_id = auth.uid()
    and bm.status = 'active'
    and bm.term_start <= current_date
    and (bm.term_end is null or bm.term_end >= current_date)
  limit 1;

  if v_board_member_id is null and not public.is_global_admin(auth.uid()) then
    raise exception 'Approver must be an active board member for this board';
  end if;

  -- update minutes approval fields
  update governance.meeting_minutes mm
  set approved_at = v_now,
      approved_by = auth.uid(),
      draft = false
  where mm.id = v_minutes_id;

  -- insert approval audit record
  insert into governance.approvals (
    entity_id,
    target_type,
    target_id,
    board_member_id,
    approval_method,
    signature_hash,
    ip_address,
    approved_at
  ) values (
    v_entity_id,
    'meeting_minutes'::governance.approval_target_type,
    v_minutes_id,
    v_board_member_id,
    coalesce(p_approval_method, 'in_app'),
    coalesce(p_signature_hash, ''),  -- allow empty until you enforce
    p_ip,
    v_now
  )
  returning id into v_approval_id;

  return v_approval_id;
end;
$function$;

-- ------------------------------------------------------------
-- Board packets
-- ------------------------------------------------------------

-- Create a board packet document + initial draft version for a meeting.
-- Attaches the created document/version ids onto governance.board_meetings.
-- Returns { document_id, version_id }.
CREATE OR REPLACE FUNCTION governance.create_board_packet_for_meeting(p_meeting_id uuid, p_title text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'governance', 'public'
AS $function$
declare
  v_entity_id uuid;
  v_document_id uuid;
  v_version_id uuid;
  v_existing uuid;
  v_document_type public.document_type;
begin
  select b.entity_id, bm.board_packet_document_id
    into v_entity_id, v_existing
  from governance.board_meetings bm
  join governance.boards b on b.id = bm.board_id
  where bm.id = p_meeting_id;

  if v_entity_id is null then
    raise exception 'Meeting not found';
  end if;

  if v_existing is not null then
    raise exception 'Board packet already exists';
  end if;

  if not (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(v_entity_id, auth.uid())
    or governance.is_board_chair(v_entity_id, auth.uid())
  ) then
    raise exception 'Not authorized';
  end if;

  if exists (
    select 1
    from unnest(enum_range(null::public.document_type)) as t(val)
    where val = 'board_packet'
  ) then
    v_document_type := 'board_packet';
  else
    v_document_type := 'other';
  end if;

  insert into public.documents (entity_id, title, document_type, visibility, status, created_by)
  values (v_entity_id, coalesce(p_title, 'Board Packet'), v_document_type, 'board_only', 'active', auth.uid())
  returning id into v_document_id;

  insert into public.document_versions (document_id, status, content_md, created_by, version_number)
  values (v_document_id, 'draft', '# Board Packet\n\n', auth.uid(), 1)
  returning id into v_version_id;

  update public.documents
    set current_version_id = v_version_id
    where id = v_document_id;

  update governance.board_meetings
    set board_packet_document_id = v_document_id,
        board_packet_version_id = v_version_id
    where id = p_meeting_id;

  return jsonb_build_object(
    'document_id', v_document_id,
    'version_id', v_version_id
  );
end;
$function$;

-- ------------------------------------------------------------
-- Triggers: board packet consistency
-- ------------------------------------------------------------

-- Trigger helper to enforce that:
-- - board_packet_version_id exists
-- - board_packet_document_id matches the version's document_id
-- Intended to be used in a BEFORE INSERT/UPDATE trigger on governance.board_meetings.
CREATE OR REPLACE FUNCTION governance.enforce_meeting_packet_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_doc_id uuid;
begin
  if new.board_packet_version_id is null then
    return new;
  end if;

  select dv.document_id into v_doc_id
  from public.document_versions dv
  where dv.id = new.board_packet_version_id;

  if v_doc_id is null then
    raise exception 'board_packet_version_id % not found', new.board_packet_version_id;
  end if;

  if new.board_packet_document_id is null then
    new.board_packet_document_id := v_doc_id;
  elsif new.board_packet_document_id <> v_doc_id then
    raise exception 'board_packet_version_id % does not belong to board_packet_document_id %',
      new.board_packet_version_id, new.board_packet_document_id;
  end if;

  return new;
end;
$function$;

-- ------------------------------------------------------------
-- Triggers: voting constraints
-- ------------------------------------------------------------

-- Trigger helper to prevent votes from being created/updated once a motion is finalized/closed.
-- Intended to be used as a BEFORE INSERT/UPDATE trigger on governance.votes.
CREATE OR REPLACE FUNCTION governance.enforce_votes_open()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'governance', 'public'
AS $function$
declare
  v_status text;
  v_finalized_at timestamptz;
begin
  select status, finalized_at
    into v_status, v_finalized_at
  from governance.motions
  where id = new.motion_id;

  if v_status is null then
    raise exception 'Motion not found';
  end if;

  -- closed if finalized_at is set OR status is terminal (must match motions_status_check)
  if v_finalized_at is not null
     or v_status in ('passed', 'failed', 'tabled') then
    raise exception 'Voting is closed for this motion';
  end if;

  return new;
end;
$function$;

-- ------------------------------------------------------------
-- Motions: finalize
-- ------------------------------------------------------------

-- Finalize a motion (counts votes, enforces quorum, stamps finalized_at/status, writes an approval audit row).
-- Returns the created approval id.
--
-- Parameter notes:
-- - p_motion_id: required
-- - p_signature_hash: optional signature hash
-- - p_approval_method: optional string, defaults to 'in_app'
-- - p_ip: optional IP address
CREATE OR REPLACE FUNCTION governance.finalize_motion(p_motion_id uuid, p_signature_hash text DEFAULT NULL::text, p_approval_method text DEFAULT NULL::text, p_ip inet DEFAULT NULL::inet)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'governance', 'public'
AS $function$
declare
  v_entity_id uuid;
  v_meeting_id uuid;
  v_board_id uuid;
  v_board_member_id uuid;
  v_yes int := 0;
  v_no int := 0;
  v_new_status text;
  v_now timestamptz := now();
  v_approval_id uuid;
  v_already_finalized boolean;
begin
  -- get meeting_id from motion
  select m.meeting_id,
         (m.finalized_at is not null)
    into v_meeting_id, v_already_finalized
  from governance.motions m
  where m.id = p_motion_id;

  if v_meeting_id is null then
    raise exception 'Motion not found';
  end if;

  if v_already_finalized then
    raise exception 'Motion already finalized';
  end if;

  -- derive entity + board from meeting
  select mtg.board_id, b.entity_id
    into v_board_id, v_entity_id
  from governance.board_meetings mtg
  join governance.boards b on b.id = mtg.board_id
  where mtg.id = v_meeting_id;

  if v_board_id is null or v_entity_id is null then
    raise exception 'Meeting not found or not linked to a board/entity';
  end if;

  -- quorum gate (server enforced)
  if not governance.is_quorum_met(v_meeting_id) then
    raise exception 'Quorum not met';
  end if;

  -- authorization: only chair/admin/global can finalize
  if not (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(v_entity_id)
    or governance.is_board_chair(v_entity_id)
  ) then
    raise exception 'Not authorized to finalize motion for this entity';
  end if;

  -- resolve board_member_id for caller (required unless global admin)
  select bm.id
    into v_board_member_id
  from governance.board_members bm
  where bm.board_id = v_board_id
    and bm.user_id = auth.uid()
    and bm.status = 'active'
    and bm.term_start <= current_date
    and (bm.term_end is null or bm.term_end >= current_date)
  limit 1;

  if v_board_member_id is null and not public.is_global_admin(auth.uid()) then
    raise exception 'Approver must be an active board member for this board';
  end if;

  -- count votes
  select
  count(*) filter (where v.vote = 'yes')::int,
  count(*) filter (where v.vote = 'no')::int
into v_yes, v_no
from governance.votes v
where v.motion_id = p_motion_id;

  -- decide final status (must match motions_status_check)
  if v_yes > v_no then
    v_new_status := 'passed';
  elsif v_no >= v_yes then
    v_new_status := 'failed';
  end if;

  -- update motion
  update governance.motions
  set status = v_new_status,
      finalized_at = v_now
  where id = p_motion_id;

  -- audit approval row (target_type enum includes 'motion')
  insert into governance.approvals (
    entity_id,
    target_type,
    target_id,
    board_member_id,
    approval_method,
    signature_hash,
    ip_address,
    approved_at
  ) values (
    v_entity_id,
    'motion'::governance.approval_target_type,
    p_motion_id,
    v_board_member_id,
    coalesce(p_approval_method, 'in_app'),
    coalesce(nullif(trim(p_signature_hash), ''), ''), -- keep permissive unless you enforce it
    p_ip,
    v_now
  )
  returning id into v_approval_id;

  return v_approval_id;
end;
$function$;

-- ------------------------------------------------------------
-- Triggers: immutability guards
-- ------------------------------------------------------------

-- Trigger helpers to enforce immutability rules.
CREATE OR REPLACE FUNCTION governance.prevent_approval_modifications()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception
    'Approvals are immutable and cannot be modified or deleted';
end;
$function$;

CREATE OR REPLACE FUNCTION governance.prevent_minutes_updates_after_approval()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if old.approved_at is not null then
    raise exception
      'Meeting minutes % are approved and cannot be modified',
      old.id;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION governance.prevent_motion_updates_after_finalize()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if old.finalized_at is not null then
    raise exception
      'Motion % is finalized and cannot be modified',
      old.id;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION governance.prevent_vote_updates()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if exists (
    select 1 from governance.motions
    where id = old.motion_id
      and finalized_at is not null
  ) then
    raise exception 'Votes cannot be modified after motion finalization';
  end if;
  return new;
end;
$function$;

-- ------------------------------------------------------------
-- Quorum helpers
-- ------------------------------------------------------------

-- Compute quorum required for a meeting.
-- Uses governance.boards.quorum_override_count when present, otherwise majority of active directors.
CREATE OR REPLACE FUNCTION governance.quorum_required_for_meeting(p_meeting_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
  v_board_id uuid;
  v_override integer;
  v_active_directors integer;
  v_required integer;
begin
  select bm.board_id
    into v_board_id
  from governance.board_meetings bm
  where bm.id = p_meeting_id;

  if v_board_id is null then
    raise exception 'Meeting not found';
  end if;

  select b.quorum_override_count
    into v_override
  from governance.boards b
  where b.id = v_board_id;

  -- count active directors (in-term)
  select count(*)
    into v_active_directors
  from governance.board_members m
  where m.board_id = v_board_id
    and m.status = 'active'
    and m.role = 'director'
    and m.term_start <= current_date
    and (m.term_end is null or m.term_end >= current_date);

  if v_active_directors = 0 then
    -- If no active directors, treat quorum as impossible (or 0). I prefer impossible.
    raise exception 'No active directors available to form quorum';
  end if;

  if v_override is not null then
    v_required := v_override;
  else
    -- majority = floor(n/2) + 1
    v_required := (v_active_directors / 2) + 1;
  end if;

  return v_required;
end;
$function$;

-- ------------------------------------------------------------
-- Board packets: set current version
-- ------------------------------------------------------------

-- Set a meeting's board packet version (and keep the document's current_version_id in sync).
-- Returns true on success.
CREATE OR REPLACE FUNCTION governance.set_board_packet_version(p_meeting_id uuid, p_document_version_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'governance', 'public'
AS $function$
declare
  v_entity_id uuid;
  v_document_id uuid;
begin
  select b.entity_id, dv.document_id
    into v_entity_id, v_document_id
  from governance.board_meetings bm
  join governance.boards b on b.id = bm.board_id
  join public.document_versions dv on dv.id = p_document_version_id
  join public.documents d on d.id = dv.document_id
  where bm.id = p_meeting_id
    and d.entity_id = b.entity_id;

  if v_entity_id is null then
    raise exception 'Meeting not found';
  end if;

  if not (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(v_entity_id, auth.uid())
    or governance.is_board_chair(v_entity_id, auth.uid())
  ) then
    raise exception 'Not authorized';
  end if;

  update governance.board_meetings
    set board_packet_document_id = v_document_id,
        board_packet_version_id = p_document_version_id
    where id = p_meeting_id;

  update public.documents
    set current_version_id = p_document_version_id
    where id = v_document_id;

  return true;
end;
$function$;

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
-- Keep this list explicit so type generation + RPC calls are stable.
-- Notes:
-- - Trigger functions do not need GRANTs (they are invoked by the database).
-- - SECURITY DEFINER RPCs still need EXECUTE granted to the caller role.

grant execute on function governance.is_board_chair(uuid, uuid) to authenticated;
grant execute on function governance.is_board_chair(uuid) to authenticated;
grant execute on function governance.is_board_chair_for_board(uuid, uuid) to authenticated;

grant execute on function governance.is_board_member(uuid, uuid) to authenticated;
grant execute on function governance.is_board_member(uuid) to authenticated;
grant execute on function governance.is_board_member_for_board(uuid, uuid) to authenticated;
grant execute on function governance.is_board_member_current(uuid) to authenticated;

grant execute on function governance.is_board_officer(uuid, uuid) to authenticated;
grant execute on function governance.is_board_officer_current(uuid) to authenticated;

grant execute on function governance.is_quorum_met(uuid) to authenticated;
grant execute on function governance.meeting_is_adjourned_for_motion(uuid) to authenticated;

grant execute on function governance.quorum_required_for_meeting(uuid) to authenticated;

-- Approval / workflow RPCs
grant execute on function governance.approve_document_version(uuid, uuid, text, text, inet) to authenticated;
grant execute on function governance.approve_meeting_minutes(uuid, text, text, inet) to authenticated;

grant execute on function governance.finalize_motion(uuid, text, text, inet) to authenticated;

grant execute on function governance.create_board_packet_for_meeting(uuid, text) to authenticated;
grant execute on function governance.set_board_packet_version(uuid, uuid) to authenticated;