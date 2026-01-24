-- Add state/school entity types and enforce entities.entity_type FK.

insert into public.entity_types (key, label, description, active)
values ('state', 'State', 'US states + DC', true)
on conflict (key) do update
set label = excluded.label,
    description = excluded.description,
    active = excluded.active;

insert into public.entity_types (key, label, description, active)
values ('school', 'School', 'School building/campus entity', true)
on conflict (key) do update
set label = excluded.label,
    description = excluded.description,
    active = excluded.active;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'entities_entity_type_fkey'
  ) then
    alter table public.entities
      add constraint entities_entity_type_fkey
      foreign key (entity_type)
      references public.entity_types (key)
      on update cascade
      on delete restrict;
  end if;
end$$;
