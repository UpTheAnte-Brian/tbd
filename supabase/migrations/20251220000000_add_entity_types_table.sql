-- Create an entity_types reference table in the public schema
create table if not exists public.entity_types (
    key text primary key,
    label text not null,
    description text,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

-- Seed the core entity types we currently support
insert into public.entity_types (key, label, description)
values
    ('district', 'District', 'School districts'),
    ('nonprofit', 'Nonprofit', 'District foundations and other charities'),
    ('business', 'Business', 'Merchants and employers')
on conflict (key) do nothing;

comment on table public.entity_types is 'Reference list of entities managed by the platform (districts, nonprofits, businesses, etc.)';
comment on column public.entity_types.key is 'Stable identifier (e.g., district, nonprofit, business)';
comment on column public.entity_types.active is 'Soft-enable flag for feature rollout';

-- Normalize existing entity_users rows and enforce FK to entity_types
-- NOTE: This migration may run in fresh environments where `public.entity_users` does not yet exist.
-- In that case, we skip normalization/constraints; there is no existing data to normalize.

do $$
begin
    if exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'entity_users'
    )
    and exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'entity_users'
          and column_name = 'entity_type'
    ) then
        -- Normalize existing rows
        update public.entity_users
        set entity_type = lower(entity_type);

        -- Remove rows whose entity_type is not supported
        delete from public.entity_users eu
        where not exists (
            select 1
            from public.entity_types et
            where et.key = eu.entity_type
        );

        -- Helpful index for lookups
        create index if not exists entity_users_entity_type_entity_id_idx
            on public.entity_users (entity_type, entity_id);

        -- Enforce FK to entity_types
        if not exists (
            select 1
            from pg_constraint
            where conname = 'entity_users_entity_type_fkey'
        ) then
            alter table public.entity_users
                add constraint entity_users_entity_type_fkey
                foreign key (entity_type) references public.entity_types(key)
                on update cascade
                on delete restrict;
        end if;

        -- Prevent duplicate assignments per user/entity/type
        if not exists (
            select 1
            from pg_constraint
            where conname = 'entity_users_unique_assignment'
        ) then
            alter table public.entity_users
                add constraint entity_users_unique_assignment
                unique (entity_type, entity_id, user_id);
        end if;
    else
        raise notice 'Skipping entity_users normalization: entity_type column not present in this environment.';
    end if;
end$$;
