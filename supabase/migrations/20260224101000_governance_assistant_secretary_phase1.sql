begin;

create table if not exists governance.meeting_transcripts (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references governance.board_meetings(id) on delete cascade,
  transcript text not null default '',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_transcripts_meeting_id_key unique (meeting_id)
);

create table if not exists governance.agent_runs (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references governance.board_meetings(id) on delete cascade,
  agent_name text not null,
  run_type text not null,
  input_hash text not null,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb,
  result_payload jsonb,
  status text not null default 'pending',
  error_message text,
  created_by uuid,
  applied_minutes_id uuid references governance.meeting_minutes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_runs_run_type_check check (run_type in ('dry_run', 'apply')),
  constraint agent_runs_status_check check (status in ('pending', 'completed', 'applied', 'failed')),
  constraint agent_runs_unique_input unique (agent_name, meeting_id, run_type, input_hash)
);

create table if not exists governance.action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references governance.board_meetings(id) on delete cascade,
  agent_run_id uuid references governance.agent_runs(id) on delete set null,
  motion_id uuid references governance.motions(id) on delete set null,
  description text not null,
  owner_name text,
  due_date date,
  status text not null default 'open',
  source_line_number integer,
  source_excerpt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint action_items_status_check check (status in ('open', 'done'))
);

create index if not exists meeting_transcripts_meeting_id_idx
  on governance.meeting_transcripts(meeting_id);

create index if not exists agent_runs_meeting_id_idx
  on governance.agent_runs(meeting_id);

create index if not exists agent_runs_created_at_idx
  on governance.agent_runs(created_at desc);

create index if not exists action_items_meeting_id_idx
  on governance.action_items(meeting_id);

create index if not exists action_items_agent_run_id_idx
  on governance.action_items(agent_run_id);

drop trigger if exists trg_meeting_transcripts_updated_at on governance.meeting_transcripts;
create trigger trg_meeting_transcripts_updated_at
before update on governance.meeting_transcripts
for each row execute function public.set_updated_at();

drop trigger if exists trg_agent_runs_updated_at on governance.agent_runs;
create trigger trg_agent_runs_updated_at
before update on governance.agent_runs
for each row execute function public.set_updated_at();

drop trigger if exists trg_action_items_updated_at on governance.action_items;
create trigger trg_action_items_updated_at
before update on governance.action_items
for each row execute function public.set_updated_at();

alter table governance.meeting_transcripts enable row level security;
alter table governance.agent_runs enable row level security;
alter table governance.action_items enable row level security;

drop policy if exists meeting_transcripts_select on governance.meeting_transcripts;
create policy meeting_transcripts_select
on governance.meeting_transcripts
for select
to authenticated
using (governance.can_read_meeting(meeting_id, auth.uid()));

drop policy if exists meeting_transcripts_insert on governance.meeting_transcripts;
create policy meeting_transcripts_insert
on governance.meeting_transcripts
for insert
to authenticated
with check (
  governance.can_read_meeting(meeting_id, auth.uid())
);

drop policy if exists meeting_transcripts_update on governance.meeting_transcripts;
create policy meeting_transcripts_update
on governance.meeting_transcripts
for update
to authenticated
using (governance.can_read_meeting(meeting_id, auth.uid()))
with check (governance.can_read_meeting(meeting_id, auth.uid()));

drop policy if exists meeting_transcripts_delete on governance.meeting_transcripts;
create policy meeting_transcripts_delete
on governance.meeting_transcripts
for delete
to authenticated
using (governance.can_read_meeting(meeting_id, auth.uid()));

drop policy if exists agent_runs_select on governance.agent_runs;
create policy agent_runs_select
on governance.agent_runs
for select
to authenticated
using (governance.can_read_meeting(meeting_id, auth.uid()));

drop policy if exists agent_runs_write_service on governance.agent_runs;
create policy agent_runs_write_service
on governance.agent_runs
to service_role
using (true)
with check (true);

drop policy if exists action_items_select on governance.action_items;
create policy action_items_select
on governance.action_items
for select
to authenticated
using (governance.can_read_meeting(meeting_id, auth.uid()));

drop policy if exists action_items_write_service on governance.action_items;
create policy action_items_write_service
on governance.action_items
to service_role
using (true)
with check (true);

grant select, insert, update, delete on table governance.meeting_transcripts to authenticated;
grant all on table governance.meeting_transcripts to service_role;

grant select on table governance.agent_runs to authenticated;
grant all on table governance.agent_runs to service_role;

grant select on table governance.action_items to authenticated;
grant all on table governance.action_items to service_role;

commit;
