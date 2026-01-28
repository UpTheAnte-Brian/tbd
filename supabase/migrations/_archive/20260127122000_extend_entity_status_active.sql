-- Allow "active" status for entity_status

alter table public.entity_status
  drop constraint if exists entity_status_valid;

alter table public.entity_status
  add constraint entity_status_valid
    check (status in ('unregistered','pending','signed','active'));
