-- governance schema + tables baseline (idempotent)
--
-- Intent:
-- 1) Ensure governance objects exist for fresh environments.
-- 2) Re-apply indexes/triggers/views/policies/grants safely.
--
-- NOTE: `create table if not exists` will NOT reconcile column/constraint drift on existing tables.
-- If you need column-by-column reconciliation, we should generate explicit ALTER TABLE statements
-- based on a diff against `information_schema.columns`.

create schema if not exists governance;

-- -----------------------------------------------------------------------------
-- Compatibility helpers (avoid hard dependency on specific helper signatures)
-- -----------------------------------------------------------------------------

-- Some environments only have: public.is_entity_admin(entity_id, user_id)
-- Others also have:          public.is_entity_admin(entity_id) (implicit auth.uid()).
-- Policies in this file should not break if one or the other is missing.

create or replace function governance.can_read_entity(p_entity_id uuid, p_user_id uuid)
returns boolean
language plpgsql
stable
security invoker
as $$
begin
  if to_regprocedure('public.is_global_admin(uuid)') is not null
     and public.is_global_admin(p_user_id)
  then
    return true;
  end if;

  if to_regprocedure('public.is_entity_admin(uuid,uuid)') is not null then
    return public.is_entity_admin(p_entity_id, p_user_id);
  elsif to_regprocedure('public.is_entity_admin(uuid)') is not null then
    -- 1-arg variant resolves auth.uid() internally
    return public.is_entity_admin(p_entity_id);
  else
    return false;
  end if;
end;
$$;

-- Board-member check wrapper. Prefer governance.is_board_member_for_board(board_id, user_id) when present.
-- If missing, fall back to a direct EXISTS query over governance.board_members.
create or replace function governance.can_read_board(p_board_id uuid, p_user_id uuid)
returns boolean
language plpgsql
stable
security invoker
as $$
begin
  if to_regprocedure('governance.is_board_member_for_board(uuid,uuid)') is not null then
    return governance.is_board_member_for_board(p_board_id, p_user_id);
  end if;

  return exists (
    select 1
    from governance.board_members bm
    where bm.board_id = p_board_id
      and bm.user_id = p_user_id
      and bm.status = 'active'
      and bm.term_start <= current_date
      and (bm.term_end is null or bm.term_end >= current_date)
  );
end;
$$;

-- Helper for meeting-join policies
create or replace function governance.can_read_meeting(p_meeting_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from governance.board_meetings m
    join governance.boards b on b.id = m.board_id
    where m.id = p_meeting_id
      and (
        governance.can_read_entity(b.entity_id, p_user_id)
        or governance.can_read_board(m.board_id, p_user_id)
      )
  );
$$;

-- -----------------------------------------------------------------------------
-- Core tables (dependency order)
-- -----------------------------------------------------------------------------

-- Boards (depends on public.entities)
create table if not exists governance.boards (
  id uuid not null default gen_random_uuid(),
  name text not null default 'Board of Directors'::text,
  created_at timestamptz not null default now(),
  entity_id uuid not null,
  quorum_rule text not null default 'majority_active_directors'::text,
  quorum_override_count integer null,
  constraint boards_pkey primary key (id),
  constraint boards_entity_fk foreign key (entity_id) references public.entities (id) on delete cascade,
  constraint boards_quorum_override_count_check check ((quorum_override_count is null) or (quorum_override_count > 0)),
  constraint boards_quorum_rule_check check (quorum_rule = 'majority_active_directors'::text)
) tablespace pg_default;

create index if not exists boards_entity_id_idx on governance.boards using btree (entity_id) tablespace pg_default;


-- Board members (depends on governance.boards, public.profiles)
-- IMPORTANT: Only keep ONE FK for user_id. We reference public.profiles(id), which itself references auth.users.
create table if not exists governance.board_members (
  id uuid not null default gen_random_uuid(),
  board_id uuid not null,
  user_id uuid not null,
  role text not null,
  term_start date not null,
  term_end date null,
  status text not null default 'active'::text,
  created_at timestamptz not null default now(),
  constraint board_members_pkey primary key (id),
  constraint board_members_board_id_user_id_key unique (board_id, user_id),
  constraint board_members_board_id_user_id_term_start_key unique (board_id, user_id, term_start),
  constraint board_members_board_id_fkey foreign key (board_id) references governance.boards (id) on delete cascade,
  constraint board_members_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade,
  constraint board_members_role_check check (
    role = any (
      array['chair','vice_chair','secretary','treasurer','director']::text[]
    )
  ),
  constraint board_members_status_check check (
    status = any (
      array['active','expired','resigned','removed']::text[]
    )
  )
) tablespace pg_default;

create index if not exists board_members_board_id_idx on governance.board_members using btree (board_id) tablespace pg_default;
create index if not exists board_members_user_id_idx on governance.board_members using btree (user_id) tablespace pg_default;


-- Board meetings (depends on governance.boards, governance.board_members, public.documents/public.document_versions, public.profiles)
create table if not exists governance.board_meetings (
  id uuid not null default gen_random_uuid(),
  board_id uuid not null,
  title text not null,
  meeting_type text not null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz null,
  location text null,
  virtual_link text null,
  status text not null default 'scheduled'::text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  board_packet_document_id uuid null,
  board_packet_version_id uuid null,
  started_at timestamptz null,
  adjourned_at timestamptz null,
  cancelled_at timestamptz null,
  finalized_at timestamptz null,
  finalized_by uuid null,
  finalized_signature_hash text null,
  constraint board_meetings_pkey primary key (id),
  constraint board_meetings_board_id_fkey foreign key (board_id) references governance.boards (id) on delete cascade,
  constraint board_meetings_board_packet_document_id_fkey foreign key (board_packet_document_id) references public.documents (id) on delete set null,
  constraint board_meetings_board_packet_version_id_fkey foreign key (board_packet_version_id) references public.document_versions (id) on delete set null,
  constraint board_meetings_created_by_fkey foreign key (created_by) references public.profiles (id),
  constraint board_meetings_finalized_by_fkey foreign key (finalized_by) references governance.board_members (id),
  constraint board_meetings_status_allowed_check check (
    status = any (array['scheduled','in_progress','adjourned','cancelled']::text[])
  ),
  constraint board_meetings_meeting_type_check check (
    meeting_type = any (array['regular','special','emergency','annual']::text[])
  ),
  constraint board_meetings_adjourned_status_check check ((adjourned_at is null) or (status = 'adjourned'::text))
) tablespace pg_default;

create index if not exists board_meetings_board_id_idx on governance.board_meetings using btree (board_id) tablespace pg_default;

-- Guarded packet indexes (optional columns may not exist in drifted envs)
DO $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='governance' and table_name='board_meetings' and column_name='board_packet_document_id'
  ) then
    execute 'create index if not exists board_meetings_packet_doc_idx on governance.board_meetings using btree (board_packet_document_id)';
  else
    raise notice 'Skipping index board_meetings_packet_doc_idx: board_packet_document_id missing';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='governance' and table_name='board_meetings' and column_name='board_packet_version_id'
  ) then
    execute 'create index if not exists board_meetings_packet_ver_idx on governance.board_meetings using btree (board_packet_version_id)';
  else
    raise notice 'Skipping index board_meetings_packet_ver_idx: board_packet_version_id missing';
  end if;
end $$;

-- Triggers on board_meetings (guarded + idempotent)
DO $$
begin
  -- lifecycle trigger
  if to_regprocedure('governance.trg_board_meetings_enforce_lifecycle()') is not null then
    drop trigger if exists board_meetings_enforce_lifecycle on governance.board_meetings;
    create trigger board_meetings_enforce_lifecycle
    before insert or update on governance.board_meetings
    for each row
    execute function governance.trg_board_meetings_enforce_lifecycle();
  else
    raise notice 'Skipping trigger board_meetings_enforce_lifecycle: function governance.trg_board_meetings_enforce_lifecycle() missing';
  end if;

  -- packet-consistency trigger (requires both columns)
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'governance'
      and c.table_name = 'board_meetings'
      and c.column_name in ('board_packet_document_id','board_packet_version_id')
    group by c.table_schema, c.table_name
    having count(*) = 2
  ) then
    if to_regprocedure('governance.enforce_meeting_packet_consistency()') is not null then
      drop trigger if exists trg_enforce_meeting_packet_consistency on governance.board_meetings;
      create trigger trg_enforce_meeting_packet_consistency
      before insert or update of board_packet_document_id, board_packet_version_id on governance.board_meetings
      for each row
      execute function governance.enforce_meeting_packet_consistency();
    else
      raise notice 'Skipping trigger trg_enforce_meeting_packet_consistency: function governance.enforce_meeting_packet_consistency() missing';
    end if;
  else
    raise notice 'Skipping trigger trg_enforce_meeting_packet_consistency: board_packet_* columns not present';
  end if;
end $$;


-- Meeting attendance (depends on governance.board_meetings, governance.board_members)
create table if not exists governance.meeting_attendance (
  id uuid not null default gen_random_uuid(),
  meeting_id uuid not null,
  board_member_id uuid not null,
  status text not null,
  constraint meeting_attendance_pkey primary key (id),
  constraint meeting_attendance_meeting_id_board_member_id_key unique (meeting_id, board_member_id),
  constraint meeting_attendance_board_member_id_fkey foreign key (board_member_id) references governance.board_members (id) on delete cascade,
  constraint meeting_attendance_meeting_id_fkey foreign key (meeting_id) references governance.board_meetings (id) on delete cascade,
  constraint meeting_attendance_status_check check (
    status = any (array['present','absent','excused']::text[])
  )
) tablespace pg_default;

create index if not exists meeting_attendance_meeting_id_idx on governance.meeting_attendance using btree (meeting_id) tablespace pg_default;
create index if not exists meeting_attendance_board_member_id_idx on governance.meeting_attendance using btree (board_member_id) tablespace pg_default;


-- Motions (depends on governance.board_meetings, governance.board_members)
create table if not exists governance.motions (
  id uuid not null default gen_random_uuid(),
  meeting_id uuid not null,
  title text not null,
  description text null,
  motion_type text not null default 'other'::text,
  moved_by uuid not null,
  seconded_by uuid null,
  status text not null default 'pending'::text,
  created_at timestamptz not null default now(),
  finalized_at timestamptz null,
  constraint motions_pkey primary key (id),
  constraint motions_meeting_id_fkey foreign key (meeting_id) references governance.board_meetings (id) on delete cascade,
  constraint motions_moved_by_fkey foreign key (moved_by) references governance.board_members (id),
  constraint motions_seconded_by_fkey foreign key (seconded_by) references governance.board_members (id),
  constraint motions_motion_type_check check (
    motion_type = any (array['resolution','policy','financial','appointment','other']::text[])
  ),
  constraint motions_status_check check (
    status = any (array['pending','voting','passed','failed','tabled']::text[])
  )
) tablespace pg_default;

create index if not exists motions_meeting_id_idx on governance.motions using btree (meeting_id) tablespace pg_default;
DO $$
begin
  if to_regprocedure('governance.prevent_motion_updates_after_finalize()') is not null then
    drop trigger if exists no_motion_updates_after_finalize on governance.motions;
    create trigger no_motion_updates_after_finalize
    before delete or update on governance.motions
    for each row
    execute function governance.prevent_motion_updates_after_finalize();
  else
    raise notice 'Skipping trigger no_motion_updates_after_finalize: function governance.prevent_motion_updates_after_finalize() missing';
  end if;
end $$;


-- Votes (depends on governance.motions, governance.board_members)
create table if not exists governance.votes (
  id uuid not null default gen_random_uuid(),
  motion_id uuid not null,
  board_member_id uuid not null,
  vote text not null,
  signed_at timestamptz not null default now(),
  signature_hash text not null default ''::text,
  constraint votes_pkey primary key (id),
  constraint votes_motion_id_board_member_id_key unique (motion_id, board_member_id),
  constraint votes_board_member_id_fkey foreign key (board_member_id) references governance.board_members (id),
  constraint votes_motion_id_fkey foreign key (motion_id) references governance.motions (id) on delete cascade,
  constraint votes_vote_check check (vote = any (array['yes','no','abstain']::text[]))
) tablespace pg_default;

create index if not exists votes_motion_id_idx on governance.votes using btree (motion_id) tablespace pg_default;

DO $$
begin
  if to_regprocedure('governance.prevent_vote_updates()') is not null then
    drop trigger if exists no_vote_updates_after_finalize on governance.votes;
    create trigger no_vote_updates_after_finalize
    before delete or update on governance.votes
    for each row
    execute function governance.prevent_vote_updates();
  else
    raise notice 'Skipping trigger no_vote_updates_after_finalize: function governance.prevent_vote_updates() missing';
  end if;

  if to_regprocedure('governance.trg_votes_block_after_adjournment()') is not null then
    drop trigger if exists votes_block_after_adjournment on governance.votes;
    create trigger votes_block_after_adjournment
    before insert or delete or update on governance.votes
    for each row
    execute function governance.trg_votes_block_after_adjournment();
  else
    raise notice 'Skipping trigger votes_block_after_adjournment: function governance.trg_votes_block_after_adjournment() missing';
  end if;

  if to_regprocedure('governance.enforce_votes_open()') is not null then
    drop trigger if exists votes_enforce_open on governance.votes;
    create trigger votes_enforce_open
    before insert or update on governance.votes
    for each row
    execute function governance.enforce_votes_open();
  else
    raise notice 'Skipping trigger votes_enforce_open: function governance.enforce_votes_open() missing';
  end if;
end $$;


-- Meeting minutes (depends on governance.board_meetings, governance.board_members)
create table if not exists governance.meeting_minutes (
  id uuid not null default gen_random_uuid(),
  meeting_id uuid not null,
  content text not null,
  draft boolean not null default true,
  approved_at timestamptz null,
  approved_by uuid null,
  status governance.minutes_status not null default 'draft'::governance.minutes_status,
  content_json jsonb null,
  content_md text null,
  finalized_at timestamptz null,
  finalized_by uuid null,
  locked_at timestamptz null,
  amended_from_id uuid null,
  version_number integer not null default 1,
  constraint meeting_minutes_pkey primary key (id),
  constraint meeting_minutes_meeting_id_unique unique (meeting_id),
  constraint meeting_minutes_amended_from_fkey foreign key (amended_from_id) references governance.meeting_minutes (id),
  constraint meeting_minutes_approved_by_fkey foreign key (approved_by) references governance.board_members (id),
  constraint meeting_minutes_finalized_by_fkey foreign key (finalized_by) references governance.board_members (id),
  constraint meeting_minutes_meeting_id_fkey foreign key (meeting_id) references governance.board_meetings (id) on delete cascade
) tablespace pg_default;

create unique index if not exists meeting_minutes_meeting_id_idx on governance.meeting_minutes using btree (meeting_id)
where (draft = false);

DO $$
begin
  if to_regprocedure('governance.trg_minutes_auto_version()') is not null then
    drop trigger if exists minutes_auto_version on governance.meeting_minutes;
    create trigger minutes_auto_version
    before insert on governance.meeting_minutes
    for each row
    execute function governance.trg_minutes_auto_version();
  else
    raise notice 'Skipping trigger minutes_auto_version: function governance.trg_minutes_auto_version() missing';
  end if;

  if to_regprocedure('governance.trg_minutes_immutable_if_finalized()') is not null then
    drop trigger if exists minutes_immutable_if_finalized on governance.meeting_minutes;
    create trigger minutes_immutable_if_finalized
    before insert or update on governance.meeting_minutes
    for each row
    execute function governance.trg_minutes_immutable_if_finalized();
  else
    raise notice 'Skipping trigger minutes_immutable_if_finalized: function governance.trg_minutes_immutable_if_finalized() missing';
  end if;

  if to_regprocedure('governance.prevent_minutes_updates_after_approval()') is not null then
    drop trigger if exists no_minutes_updates_after_approval on governance.meeting_minutes;
    create trigger no_minutes_updates_after_approval
    before delete or update on governance.meeting_minutes
    for each row
    execute function governance.prevent_minutes_updates_after_approval();
  else
    raise notice 'Skipping trigger no_minutes_updates_after_approval: function governance.prevent_minutes_updates_after_approval() missing';
  end if;

  if to_regprocedure('governance.prevent_minutes_update_when_locked()') is not null then
    drop trigger if exists trg_prevent_minutes_update_when_locked on governance.meeting_minutes;
    create trigger trg_prevent_minutes_update_when_locked
    before delete or update on governance.meeting_minutes
    for each row
    execute function governance.prevent_minutes_update_when_locked();
  else
    raise notice 'Skipping trigger trg_prevent_minutes_update_when_locked: function governance.prevent_minutes_update_when_locked() missing';
  end if;
end $$;


-- Approvals (depends on public.entities, governance.board_members)
create table if not exists governance.approvals (
  id uuid not null default gen_random_uuid(),
  entity_id uuid not null,
  target_type governance.approval_target_type not null,
  target_id uuid not null,
  board_member_id uuid not null,
  approval_method text not null default 'clickwrap'::text,
  signature_hash text not null,
  ip_address inet null,
  approved_at timestamptz not null default now(),
  constraint approvals_pkey primary key (id),
  constraint approvals_board_member_id_fkey foreign key (board_member_id) references governance.board_members (id) on delete cascade,
  constraint approvals_entity_id_fkey foreign key (entity_id) references public.entities (id) on delete cascade
) tablespace pg_default;

create index if not exists approvals_entity_idx on governance.approvals using btree (entity_id) tablespace pg_default;
create index if not exists approvals_target_idx on governance.approvals using btree (target_type, target_id) tablespace pg_default;
create index if not exists approvals_board_member_idx on governance.approvals using btree (board_member_id) tablespace pg_default;


-- -----------------------------------------------------------------------------
-- Views (must come after referenced tables)
-- -----------------------------------------------------------------------------

-- create or replace view governance.meeting_minutes_expanded as
-- select
--   mm.id,
--   mm.meeting_id,
--   mm.content,
--   mm.draft,
--   mm.approved_at,
--   mm.approved_by,
--   mm.status,
--   mm.content_json,
--   mm.content_md,
--   mm.finalized_at,
--   mm.finalized_by,
--   mm.locked_at,
--   mm.amended_from_id,
--   mm.version_number,
--   bm.board_id,
--   bm.scheduled_start,
--   bm.scheduled_end,
--   bm.meeting_type,
--   bm.title as meeting_title,
--   bm.status as meeting_status
-- from governance.meeting_minutes mm
-- join governance.board_meetings bm on bm.id = mm.meeting_id;


-- -----------------------------------------------------------------------------
-- RLS + Grants + Policies
--
-- Pattern:
-- - authenticated can read governance data if they are:
--   * global admin, OR
--   * entity admin for the board's entity, OR
--   * an active board member for the board
-- - writes restricted to service_role (use SECURITY DEFINER RPCs for mutations)
-- -----------------------------------------------------------------------------

-- Enable RLS
alter table governance.boards enable row level security;
alter table governance.board_members enable row level security;
alter table governance.board_meetings enable row level security;
alter table governance.meeting_attendance enable row level security;
alter table governance.motions enable row level security;
alter table governance.votes enable row level security;
alter table governance.meeting_minutes enable row level security;
alter table governance.approvals enable row level security;

-- Revoke default privileges
revoke all on all tables in schema governance from public;
revoke all on all sequences in schema governance from public;
revoke all on all functions in schema governance from public;

-- Table grants
grant usage on schema governance to authenticated;
grant execute on function governance.can_read_entity(uuid, uuid) to authenticated;
grant execute on function governance.can_read_board(uuid, uuid) to authenticated;
grant execute on function governance.can_read_meeting(uuid, uuid) to authenticated;
grant select on all tables in schema governance to authenticated;
grant select on governance.meeting_minutes_expanded to authenticated;

grant all on all tables in schema governance to service_role;

-- Policies
-- Helper: map a board_id -> entity_id via governance.boards
-- We keep these policies simple and rely on existing helper functions:
--   public.is_global_admin(auth.uid())
--   public.is_entity_admin(entity_id) OR public.is_entity_admin(entity_id, auth.uid())
--   governance.is_board_member_for_board(board_id, auth.uid())

-- governance.boards
 drop policy if exists "boards read" on governance.boards;
create policy "boards read"
on governance.boards
for select
to authenticated
using (
  governance.can_read_entity(entity_id, auth.uid())
);

 drop policy if exists "boards write service" on governance.boards;
create policy "boards write service"
on governance.boards
for all
to service_role
using (true)
with check (true);

-- governance.board_members
 drop policy if exists "board_members read" on governance.board_members;
create policy "board_members read"
on governance.board_members
for select
to authenticated
using (
  governance.can_read_board(board_members.board_id, auth.uid())
  or exists (
    select 1
    from governance.boards b
    where b.id = board_members.board_id
      and governance.can_read_entity(b.entity_id, auth.uid())
  )
);

 drop policy if exists "board_members write service" on governance.board_members;
create policy "board_members write service"
on governance.board_members
for all
to service_role
using (true)
with check (true);

-- governance.board_meetings
 drop policy if exists "board_meetings read" on governance.board_meetings;
create policy "board_meetings read"
on governance.board_meetings
for select
to authenticated
using (
  governance.can_read_board(board_meetings.board_id, auth.uid())
  or exists (
    select 1
    from governance.boards b
    where b.id = board_meetings.board_id
      and governance.can_read_entity(b.entity_id, auth.uid())
  )
);

 drop policy if exists "board_meetings write service" on governance.board_meetings;
create policy "board_meetings write service"
on governance.board_meetings
for all
to service_role
using (true)
with check (true);

-- governance.meeting_attendance
 drop policy if exists "meeting_attendance read" on governance.meeting_attendance;
create policy "meeting_attendance read"
on governance.meeting_attendance
for select
to authenticated
using (
  governance.can_read_meeting(meeting_attendance.meeting_id, auth.uid())
);

 drop policy if exists "meeting_attendance write service" on governance.meeting_attendance;
create policy "meeting_attendance write service"
on governance.meeting_attendance
for all
to service_role
using (true)
with check (true);

-- governance.motions
 drop policy if exists "motions read" on governance.motions;
create policy "motions read"
on governance.motions
for select
to authenticated
using (
  governance.can_read_meeting(motions.meeting_id, auth.uid())
);

 drop policy if exists "motions write service" on governance.motions;
create policy "motions write service"
on governance.motions
for all
to service_role
using (true)
with check (true);

-- governance.votes
 drop policy if exists "votes read" on governance.votes;
create policy "votes read"
on governance.votes
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or exists (
    select 1
    from governance.motions mo
    join governance.board_meetings m on m.id = mo.meeting_id
    join governance.boards b on b.id = m.board_id
    where mo.id = votes.motion_id
      and (
        governance.can_read_entity(b.entity_id, auth.uid())
        or governance.can_read_board(m.board_id, auth.uid())
      )
  )
);

 drop policy if exists "votes write service" on governance.votes;
create policy "votes write service"
on governance.votes
for all
to service_role
using (true)
with check (true);

-- governance.meeting_minutes
 drop policy if exists "meeting_minutes read" on governance.meeting_minutes;
create policy "meeting_minutes read"
on governance.meeting_minutes
for select
to authenticated
using (
  governance.can_read_meeting(meeting_minutes.meeting_id, auth.uid())
);

 drop policy if exists "meeting_minutes write service" on governance.meeting_minutes;
create policy "meeting_minutes write service"
on governance.meeting_minutes
for all
to service_role
using (true)
with check (true);

-- governance.approvals
 drop policy if exists "approvals read" on governance.approvals;
create policy "approvals read"
on governance.approvals
for select
to authenticated
using (
  governance.can_read_entity(entity_id, auth.uid())
);

 drop policy if exists "approvals write service" on governance.approvals;
create policy "approvals write service"
on governance.approvals
for all
to service_role
using (true)
with check (true);

-- View grants (views don't support RLS; they inherit underlying table policies)
revoke all on governance.meeting_minutes_expanded from public;
grant select on governance.meeting_minutes_expanded to authenticated;
grant select on governance.meeting_minutes_expanded to service_role;

revoke all on function governance.can_read_entity(uuid, uuid) from public;
revoke all on function governance.can_read_board(uuid, uuid) from public;
revoke all on function governance.can_read_meeting(uuid, uuid) from public;

grant execute on function governance.can_read_entity(uuid, uuid) to authenticated;
grant execute on function governance.can_read_board(uuid, uuid) to authenticated;
grant execute on function governance.can_read_meeting(uuid, uuid) to authenticated;

grant execute on function governance.can_read_entity(uuid, uuid) to service_role;
grant execute on function governance.can_read_board(uuid, uuid) to service_role;
grant execute on function governance.can_read_meeting(uuid, uuid) to service_role;
