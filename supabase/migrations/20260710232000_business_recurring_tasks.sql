begin;

create table if not exists business.business_recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null
    constraint business_recurring_tasks_entity_id_fkey
    references public.entities(id) on delete cascade,
  title text not null,
  task_type text not null default 'bill_payment'
    check (
      task_type in (
        'bill_payment',
        'vendor_payable',
        'profit_share',
        'tax_filing',
        'payroll',
        'transfer',
        'reconciliation',
        'reporting',
        'review',
        'other'
      )
    ),
  description text,
  cadence text not null default 'monthly'
    check (cadence in ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
  interval_count integer not null default 1
    check (interval_count between 1 and 365),
  anchor_date date not null,
  responsibility_id uuid
    constraint business_recurring_tasks_responsibility_id_fkey
    references business.business_responsibilities(id) on delete set null,
  system_id uuid
    constraint business_recurring_tasks_system_id_fkey
    references business.business_systems(id) on delete set null,
  account_id uuid
    constraint business_recurring_tasks_account_id_fkey
    references business.business_financial_accounts(id) on delete set null,
  is_active boolean not null default true,
  last_completed_at timestamptz,
  last_completed_for_due_date date,
  last_completed_by uuid
    constraint business_recurring_tasks_last_completed_by_fkey
    references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_recurring_tasks_completion_window_chk
    check (
      last_completed_for_due_date is null
      or last_completed_for_due_date >= anchor_date
    )
);

create index if not exists business_recurring_tasks_entity_idx
  on business.business_recurring_tasks (entity_id, is_active, cadence, anchor_date);

create index if not exists business_recurring_tasks_responsibility_idx
  on business.business_recurring_tasks (responsibility_id);

create index if not exists business_recurring_tasks_system_idx
  on business.business_recurring_tasks (system_id);

create index if not exists business_recurring_tasks_account_idx
  on business.business_recurring_tasks (account_id);

drop trigger if exists trg_business_recurring_tasks_updated_at on business.business_recurring_tasks;
create trigger trg_business_recurring_tasks_updated_at
before update on business.business_recurring_tasks
for each row execute function public.set_updated_at();

grant select, insert, update, delete on business.business_recurring_tasks to authenticated;
grant all on business.business_recurring_tasks to service_role;

alter table business.business_recurring_tasks enable row level security;

drop policy if exists business_recurring_tasks_select_entity_read on business.business_recurring_tasks;
create policy business_recurring_tasks_select_entity_read
on business.business_recurring_tasks
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.can_read_entity(entity_id, auth.uid())
);

drop policy if exists business_recurring_tasks_insert_entity_admin on business.business_recurring_tasks;
create policy business_recurring_tasks_insert_entity_admin
on business.business_recurring_tasks
for insert
to authenticated
with check (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

drop policy if exists business_recurring_tasks_update_entity_admin on business.business_recurring_tasks;
create policy business_recurring_tasks_update_entity_admin
on business.business_recurring_tasks
for update
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
)
with check (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

drop policy if exists business_recurring_tasks_delete_entity_admin on business.business_recurring_tasks;
create policy business_recurring_tasks_delete_entity_admin
on business.business_recurring_tasks
for delete
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

create or replace function public.create_entity_bookkeeping_recurring_task(
  p_entity_id uuid,
  p_title text,
  p_task_type text default 'bill_payment',
  p_description text default null,
  p_cadence text default 'monthly',
  p_interval_count integer default 1,
  p_anchor_date date default null,
  p_responsibility_id uuid default null,
  p_system_id uuid default null,
  p_account_id uuid default null,
  p_is_active boolean default true,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_row business.business_recurring_tasks%rowtype;
begin
  perform public.assert_business_bookkeeping_admin(p_entity_id);

  if p_system_id is not null and not exists (
    select 1
    from business.business_systems bs
    where bs.id = p_system_id
      and bs.entity_id = p_entity_id
  ) then
    raise exception 'Invalid system for entity';
  end if;

  if p_account_id is not null and not exists (
    select 1
    from business.business_financial_accounts bfa
    where bfa.id = p_account_id
      and bfa.entity_id = p_entity_id
  ) then
    raise exception 'Invalid account for entity';
  end if;

  if p_responsibility_id is not null and not exists (
    select 1
    from business.business_responsibilities br
    where br.id = p_responsibility_id
      and br.entity_id = p_entity_id
  ) then
    raise exception 'Invalid responsibility for entity';
  end if;

  insert into business.business_recurring_tasks (
    entity_id,
    title,
    task_type,
    description,
    cadence,
    interval_count,
    anchor_date,
    responsibility_id,
    system_id,
    account_id,
    is_active,
    notes
  )
  values (
    p_entity_id,
    p_title,
    p_task_type,
    p_description,
    p_cadence,
    greatest(coalesce(p_interval_count, 1), 1),
    p_anchor_date,
    p_responsibility_id,
    p_system_id,
    p_account_id,
    coalesce(p_is_active, true),
    p_notes
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.create_entity_bookkeeping_recurring_task(uuid, text, text, text, text, integer, date, uuid, uuid, uuid, boolean, text) from public;
grant execute on function public.create_entity_bookkeeping_recurring_task(uuid, text, text, text, text, integer, date, uuid, uuid, uuid, boolean, text) to authenticated;

create or replace function public.update_entity_bookkeeping_recurring_task(
  p_entity_id uuid,
  p_task_id uuid,
  p_title text,
  p_task_type text default 'bill_payment',
  p_description text default null,
  p_cadence text default 'monthly',
  p_interval_count integer default 1,
  p_anchor_date date default null,
  p_responsibility_id uuid default null,
  p_system_id uuid default null,
  p_account_id uuid default null,
  p_is_active boolean default true,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_row business.business_recurring_tasks%rowtype;
begin
  perform public.assert_business_bookkeeping_admin(p_entity_id);

  if p_system_id is not null and not exists (
    select 1
    from business.business_systems bs
    where bs.id = p_system_id
      and bs.entity_id = p_entity_id
  ) then
    raise exception 'Invalid system for entity';
  end if;

  if p_account_id is not null and not exists (
    select 1
    from business.business_financial_accounts bfa
    where bfa.id = p_account_id
      and bfa.entity_id = p_entity_id
  ) then
    raise exception 'Invalid account for entity';
  end if;

  if p_responsibility_id is not null and not exists (
    select 1
    from business.business_responsibilities br
    where br.id = p_responsibility_id
      and br.entity_id = p_entity_id
  ) then
    raise exception 'Invalid responsibility for entity';
  end if;

  update business.business_recurring_tasks
  set
    title = p_title,
    task_type = p_task_type,
    description = p_description,
    cadence = p_cadence,
    interval_count = greatest(coalesce(p_interval_count, 1), 1),
    anchor_date = p_anchor_date,
    responsibility_id = p_responsibility_id,
    system_id = p_system_id,
    account_id = p_account_id,
    is_active = coalesce(p_is_active, true),
    notes = p_notes
  where id = p_task_id
    and entity_id = p_entity_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Recurring task not found';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.update_entity_bookkeeping_recurring_task(uuid, uuid, text, text, text, text, integer, date, uuid, uuid, uuid, boolean, text) from public;
grant execute on function public.update_entity_bookkeeping_recurring_task(uuid, uuid, text, text, text, text, integer, date, uuid, uuid, uuid, boolean, text) to authenticated;

create or replace function public.complete_entity_bookkeeping_recurring_task(
  p_entity_id uuid,
  p_task_id uuid,
  p_completed_for_due_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_user_id uuid;
  v_anchor_date date;
  v_row business.business_recurring_tasks%rowtype;
begin
  v_user_id := public.assert_business_bookkeeping_admin(p_entity_id);

  select anchor_date
  into v_anchor_date
  from business.business_recurring_tasks
  where id = p_task_id
    and entity_id = p_entity_id;

  if v_anchor_date is null then
    raise exception 'Recurring task not found';
  end if;

  if p_completed_for_due_date < v_anchor_date then
    raise exception 'Completion due date cannot be before anchor date';
  end if;

  update business.business_recurring_tasks
  set
    last_completed_at = now(),
    last_completed_for_due_date = p_completed_for_due_date,
    last_completed_by = v_user_id
  where id = p_task_id
    and entity_id = p_entity_id
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.complete_entity_bookkeeping_recurring_task(uuid, uuid, date) from public;
grant execute on function public.complete_entity_bookkeeping_recurring_task(uuid, uuid, date) to authenticated;

create or replace function public.get_entity_bookkeeping_snapshot(
  p_entity_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, business
as $$
declare
  v_snapshot jsonb;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if not exists (
    select 1
    from public.entities e
    where e.id = p_entity_id
      and e.entity_type = 'business'
  ) then
    raise exception 'Business entity not found';
  end if;

  if not (
    public.is_global_admin(auth.uid())
    or public.can_read_entity(p_entity_id, auth.uid())
  ) then
    raise exception 'Unauthorized';
  end if;

  select jsonb_build_object(
    'profile',
    (
      select to_jsonb(bp)
      from business.business_profiles bp
      where bp.entity_id = p_entity_id
      limit 1
    ),
    'systems',
    coalesce((
      select jsonb_agg(
        to_jsonb(bs) || jsonb_build_object(
          'owner_person_name', epr.display_name,
          'owner_user_name', p.full_name
        )
        order by bs.system_type, bs.system_name
      )
      from business.business_systems bs
      left join public.entity_person_roles epr
        on epr.id = bs.owner_person_role_id
      left join public.profiles p
        on p.id = bs.owner_user_id
      where bs.entity_id = p_entity_id
    ), '[]'::jsonb),
    'accounts',
    coalesce((
      select jsonb_agg(
        to_jsonb(bfa) || jsonb_build_object(
          'system_name', bs.system_name
        )
        order by bfa.account_type, bfa.account_name
      )
      from business.business_financial_accounts bfa
      left join business.business_systems bs
        on bs.id = bfa.system_id
      where bfa.entity_id = p_entity_id
    ), '[]'::jsonb),
    'responsibilities',
    coalesce((
      select jsonb_agg(
        to_jsonb(br) || jsonb_build_object(
          'person_name', epr.display_name,
          'user_name', p.full_name,
          'system_name', bs.system_name,
          'account_name', bfa.account_name
        )
        order by br.responsibility_type, br.is_primary desc
      )
      from business.business_responsibilities br
      left join public.entity_person_roles epr
        on epr.id = br.person_role_id
      left join public.profiles p
        on p.id = br.user_id
      left join business.business_systems bs
        on bs.id = br.system_id
      left join business.business_financial_accounts bfa
        on bfa.id = br.account_id
      where br.entity_id = p_entity_id
    ), '[]'::jsonb),
    'recurringTasks',
    coalesce((
      select jsonb_agg(
        to_jsonb(brt) || jsonb_build_object(
          'responsibility_name',
          coalesce(owner_role.display_name, owner_profile.full_name, br.contact_name),
          'system_name', bs.system_name,
          'account_name', bfa.account_name,
          'completed_by_name', completed_by.full_name
        )
        order by brt.is_active desc, brt.anchor_date, brt.title
      )
      from business.business_recurring_tasks brt
      left join business.business_responsibilities br
        on br.id = brt.responsibility_id
      left join public.entity_person_roles owner_role
        on owner_role.id = br.person_role_id
      left join public.profiles owner_profile
        on owner_profile.id = br.user_id
      left join business.business_systems bs
        on bs.id = brt.system_id
      left join business.business_financial_accounts bfa
        on bfa.id = brt.account_id
      left join public.profiles completed_by
        on completed_by.id = brt.last_completed_by
      where brt.entity_id = p_entity_id
    ), '[]'::jsonb),
    'closeTemplates',
    coalesce((
      select jsonb_agg(
        to_jsonb(bct) || jsonb_build_object(
          'created_by_name', p.full_name,
          'tasks', coalesce((
            select jsonb_agg(
              to_jsonb(task) || jsonb_build_object(
                'system_name', bs.system_name,
                'account_name', bfa.account_name
              )
              order by task.sort_order, task.title
            )
            from business.business_close_template_tasks task
            left join business.business_systems bs
              on bs.id = task.system_id
            left join business.business_financial_accounts bfa
              on bfa.id = task.account_id
            where task.template_id = bct.id
          ), '[]'::jsonb)
        )
        order by bct.is_active desc, bct.name
      )
      from business.business_close_templates bct
      left join public.profiles p
        on p.id = bct.created_by
      where bct.entity_id = p_entity_id
    ), '[]'::jsonb),
    'closePeriods',
    coalesce((
      select jsonb_agg(
        to_jsonb(bcp) || jsonb_build_object(
          'owner_user_name', p.full_name,
          'tasks', coalesce((
            select jsonb_agg(
              to_jsonb(task) || jsonb_build_object(
                'assigned_user_name', assigned_profile.full_name,
                'assigned_person_name', assigned_person.display_name,
                'completed_by_name', completed_profile.full_name,
                'system_name', bs.system_name,
                'account_name', bfa.account_name
              )
              order by task.due_date nulls last, task.title
            )
            from business.business_close_tasks task
            left join public.profiles assigned_profile
              on assigned_profile.id = task.assigned_user_id
            left join public.entity_person_roles assigned_person
              on assigned_person.id = task.assigned_person_role_id
            left join public.profiles completed_profile
              on completed_profile.id = task.completed_by
            left join business.business_systems bs
              on bs.id = task.system_id
            left join business.business_financial_accounts bfa
              on bfa.id = task.account_id
            where task.close_period_id = bcp.id
          ), '[]'::jsonb)
        )
        order by bcp.period_end desc
      )
      from (
        select *
        from business.business_close_periods
        where entity_id = p_entity_id
        order by period_end desc
        limit 6
      ) bcp
      left join public.profiles p
        on p.id = bcp.owner_user_id
    ), '[]'::jsonb)
  )
  into v_snapshot;

  return coalesce(
    v_snapshot,
    jsonb_build_object(
      'profile', null,
      'systems', '[]'::jsonb,
      'accounts', '[]'::jsonb,
      'responsibilities', '[]'::jsonb,
      'recurringTasks', '[]'::jsonb,
      'closeTemplates', '[]'::jsonb,
      'closePeriods', '[]'::jsonb
    )
  );
end;
$$;

grant execute on function public.get_entity_bookkeeping_snapshot(uuid) to authenticated;

commit;
