-- -----------------------------------------------------------------------------
-- Governance: meeting attendance + approvals
--
-- Notes:
-- - These tables are written primarily via SECURITY DEFINER governance RPCs.
-- - We still enable RLS and provide read access for authenticated users who are
--   authorized for the underlying entity/board.
-- - Direct writes are restricted to service_role (RPCs run as definer).
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- governance.meeting_attendance
-- -----------------------------------------------------------------------------

create table if not exists governance.meeting_attendance (
  id uuid not null default gen_random_uuid(),
  meeting_id uuid not null,
  board_member_id uuid not null,
  status text not null,

  constraint meeting_attendance_pkey primary key (id),
  constraint meeting_attendance_meeting_id_board_member_id_key unique (meeting_id, board_member_id),
  constraint meeting_attendance_board_member_id_fkey foreign key (board_member_id)
    references governance.board_members (id) on delete cascade,
  constraint meeting_attendance_meeting_id_fkey foreign key (meeting_id)
    references governance.board_meetings (id) on delete cascade,
  constraint meeting_attendance_status_check check (
    status = any (array['present'::text, 'absent'::text, 'excused'::text])
  )
) tablespace pg_default;

create index if not exists meeting_attendance_meeting_id_idx
  on governance.meeting_attendance using btree (meeting_id)
  tablespace pg_default;

create index if not exists meeting_attendance_board_member_id_idx
  on governance.meeting_attendance using btree (board_member_id)
  tablespace pg_default;

alter table governance.meeting_attendance enable row level security;

-- Read: entity admins, global admins, and members of the meeting's board.
-- (Board membership is checked via governance.is_board_member_for_board.)
create policy "meeting_attendance_read" on governance.meeting_attendance
  for select
  to authenticated
  using (
    exists (
      select 1
      from governance.board_meetings mtg
      join governance.boards b on b.id = mtg.board_id
      where mtg.id = meeting_attendance.meeting_id
        and (
          public.is_global_admin(auth.uid())
          or public.is_entity_admin(b.entity_id, auth.uid())
          or governance.is_board_member_for_board(mtg.board_id, auth.uid())
        )
    )
  );

-- Writes are intended to happen via SECURITY DEFINER RPCs.
create policy "meeting_attendance_write_service_role" on governance.meeting_attendance
  for all
  to service_role
  using (true)
  with check (true);

-- Grants
revoke all on table governance.meeting_attendance from public;
grant select on table governance.meeting_attendance to authenticated;
grant all on table governance.meeting_attendance to service_role;


-- -----------------------------------------------------------------------------
-- governance.approvals
-- -----------------------------------------------------------------------------

create table if not exists governance.approvals (
  id uuid not null default gen_random_uuid(),
  entity_id uuid not null,
  target_type governance.approval_target_type not null,
  target_id uuid not null,
  board_member_id uuid not null,
  approval_method text not null default 'clickwrap'::text,
  signature_hash text not null,
  ip_address inet null,
  approved_at timestamp with time zone not null default now(),

  constraint approvals_pkey primary key (id),
  constraint approvals_board_member_id_fkey foreign key (board_member_id)
    references governance.board_members (id) on delete cascade,
  constraint approvals_entity_id_fkey foreign key (entity_id)
    references entities (id) on delete cascade
) tablespace pg_default;

create index if not exists approvals_entity_idx
  on governance.approvals using btree (entity_id)
  tablespace pg_default;

create index if not exists approvals_target_idx
  on governance.approvals using btree (target_type, target_id)
  tablespace pg_default;

create index if not exists approvals_board_member_idx
  on governance.approvals using btree (board_member_id)
  tablespace pg_default;

alter table governance.approvals enable row level security;

-- Read: entity admins, global admins, and board members for the entity.
create policy "approvals_read" on governance.approvals
  for select
  to authenticated
  using (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(approvals.entity_id, auth.uid())
    or governance.is_board_member(approvals.entity_id, auth.uid())
  );

-- Writes are intended to happen via SECURITY DEFINER RPCs.
create policy "approvals_write_service_role" on governance.approvals
  for all
  to service_role
  using (true)
  with check (true);

-- Grants
revoke all on table governance.approvals from public;
grant select on table governance.approvals to authenticated;
grant all on table governance.approvals to service_role;