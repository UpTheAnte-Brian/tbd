begin;

create table if not exists business.business_recurring_task_documents (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null
    constraint business_recurring_task_documents_task_id_fkey
    references business.business_recurring_tasks(id) on delete cascade,
  document_id uuid not null
    constraint business_recurring_task_documents_document_id_fkey
    references public.documents(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid
    constraint business_recurring_task_documents_created_by_fkey
    references public.profiles(id) on delete set null,
  constraint business_recurring_task_documents_task_document_uq
    unique (task_id, document_id)
);

create index if not exists business_recurring_task_documents_task_idx
  on business.business_recurring_task_documents (task_id, created_at desc);

create index if not exists business_recurring_task_documents_document_idx
  on business.business_recurring_task_documents (document_id);

grant select, insert, delete on business.business_recurring_task_documents to authenticated;
grant all on business.business_recurring_task_documents to service_role;

alter table business.business_recurring_task_documents enable row level security;

drop policy if exists business_recurring_task_documents_select_entity_read on business.business_recurring_task_documents;
create policy business_recurring_task_documents_select_entity_read
on business.business_recurring_task_documents
for select
to authenticated
using (
  exists (
    select 1
    from business.business_recurring_tasks brt
    where brt.id = business_recurring_task_documents.task_id
      and (
        public.is_global_admin(auth.uid())
        or public.can_read_entity(brt.entity_id, auth.uid())
      )
  )
);

drop policy if exists business_recurring_task_documents_insert_entity_admin on business.business_recurring_task_documents;
create policy business_recurring_task_documents_insert_entity_admin
on business.business_recurring_task_documents
for insert
to authenticated
with check (
  exists (
    select 1
    from business.business_recurring_tasks brt
    where brt.id = business_recurring_task_documents.task_id
      and (
        public.is_global_admin(auth.uid())
        or public.is_entity_admin(auth.uid(), brt.entity_id)
      )
  )
);

drop policy if exists business_recurring_task_documents_delete_entity_admin on business.business_recurring_task_documents;
create policy business_recurring_task_documents_delete_entity_admin
on business.business_recurring_task_documents
for delete
to authenticated
using (
  exists (
    select 1
    from business.business_recurring_tasks brt
    where brt.id = business_recurring_task_documents.task_id
      and (
        public.is_global_admin(auth.uid())
        or public.is_entity_admin(auth.uid(), brt.entity_id)
      )
  )
);

create or replace function public.attach_entity_bookkeeping_recurring_task_document(
  p_entity_id uuid,
  p_task_id uuid,
  p_document_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_user_id uuid;
  v_row business.business_recurring_task_documents%rowtype;
begin
  v_user_id := public.assert_business_bookkeeping_admin(p_entity_id);

  if not exists (
    select 1
    from business.business_recurring_tasks brt
    where brt.id = p_task_id
      and brt.entity_id = p_entity_id
  ) then
    raise exception 'Recurring task not found for entity';
  end if;

  if not exists (
    select 1
    from public.documents d
    where d.id = p_document_id
      and d.entity_id = p_entity_id
  ) then
    raise exception 'Invalid document for entity';
  end if;

  insert into business.business_recurring_task_documents (
    task_id,
    document_id,
    created_by
  )
  values (
    p_task_id,
    p_document_id,
    v_user_id
  )
  on conflict (task_id, document_id) do update
    set created_by = excluded.created_by
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.attach_entity_bookkeeping_recurring_task_document(uuid, uuid, uuid) from public;
grant execute on function public.attach_entity_bookkeeping_recurring_task_document(uuid, uuid, uuid) to authenticated;

create or replace function public.get_entity_bookkeeping_snapshot(
  p_entity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_snapshot jsonb;
begin
  if not (
    public.is_global_admin(auth.uid())
    or public.can_read_entity(p_entity_id, auth.uid())
  ) then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'profile',
    (
      select to_jsonb(bp)
      from business.business_profiles bp
      where bp.entity_id = p_entity_id
    ),
    'serviceEngagements',
    coalesce((
      select jsonb_agg(
        to_jsonb(bse) || jsonb_build_object(
          'created_by_name', created_by.full_name,
          'provider_entity_name', provider_entity.name,
          'client_entity_name', client_entity.name,
          'current_entity_role', case
            when bse.entity_id = p_entity_id then 'provider'
            else 'client'
          end,
          'counterparty_name', case
            when bse.entity_id = p_entity_id then client_entity.name
            else provider_entity.name
          end,
          'contract_document_title', contract_document.title,
          'contract_document_mime_type', contract_version.mime_type,
          'contract_document_storage_bucket', contract_version.storage_bucket,
          'contract_document_storage_path', contract_version.storage_path,
          'total_billable_hours',
          coalesce((
            select sum(bte.hours)
            from business.business_time_entries bte
            where bte.engagement_id = bse.id
              and bte.billable
          ), 0),
          'unbilled_hours',
          coalesce((
            select sum(bte.hours)
            from business.business_time_entries bte
            where bte.engagement_id = bse.id
              and bte.billable
              and bte.invoice_id is null
          ), 0),
          'unbilled_amount',
          coalesce((
            select sum(
              bte.hours * coalesce(bte.hourly_rate, bse.default_hourly_rate, 0)
            )
            from business.business_time_entries bte
            where bte.engagement_id = bse.id
              and bte.billable
              and bte.invoice_id is null
          ), 0),
          'invoiced_amount',
          coalesce((
            select sum(
              bte.hours * coalesce(bte.hourly_rate, bse.default_hourly_rate, 0)
            )
            from business.business_time_entries bte
            where bte.engagement_id = bse.id
              and bte.billable
              and bte.invoice_id is not null
          ), 0)
        )
        order by bse.is_active desc, bse.title
      )
      from business.business_service_engagements bse
      left join public.profiles created_by
        on created_by.id = bse.created_by
      left join public.entities provider_entity
        on provider_entity.id = bse.entity_id
      left join public.entities client_entity
        on client_entity.id = bse.client_entity_id
      left join public.documents contract_document
        on contract_document.id = bse.contract_document_id
      left join public.document_versions contract_version
        on contract_version.id = contract_document.current_version_id
      where bse.entity_id = p_entity_id
        or bse.client_entity_id = p_entity_id
    ), '[]'::jsonb),
    'timeEntries',
    coalesce((
      select jsonb_agg(
        to_jsonb(bte) || jsonb_build_object(
          'engagement_title', bse.title,
          'invoice_number', bi.invoice_number,
          'created_by_name', created_by.full_name,
          'effective_hourly_rate', coalesce(
            bte.hourly_rate,
            bse.default_hourly_rate
          ),
          'current_entity_role', case
            when bse.entity_id = p_entity_id then 'provider'
            else 'client'
          end,
          'counterparty_name', case
            when bse.entity_id = p_entity_id then client_entity.name
            else provider_entity.name
          end,
          'amount', case
            when bte.billable then
              bte.hours * coalesce(bte.hourly_rate, bse.default_hourly_rate, 0)
            else 0
          end
        )
        order by bte.work_date desc, bte.created_at desc
      )
      from (
        select *
        from business.business_time_entries
        where entity_id = p_entity_id
           or engagement_id in (
             select id
             from business.business_service_engagements
             where client_entity_id = p_entity_id
           )
        order by work_date desc, created_at desc
        limit 250
      ) bte
      join business.business_service_engagements bse
        on bse.id = bte.engagement_id
      left join public.entities provider_entity
        on provider_entity.id = bse.entity_id
      left join public.entities client_entity
        on client_entity.id = bse.client_entity_id
      left join public.profiles created_by
        on created_by.id = bte.created_by
      left join business.business_invoices bi
        on bi.id = bte.invoice_id
    ), '[]'::jsonb),
    'invoices',
    coalesce((
      select jsonb_agg(
        to_jsonb(bi) || jsonb_build_object(
          'engagement_title', bse.title,
          'created_by_name', created_by.full_name,
          'current_entity_role', case
            when bse.entity_id = p_entity_id then 'provider'
            else 'client'
          end,
          'counterparty_name', case
            when bse.entity_id = p_entity_id then client_entity.name
            else provider_entity.name
          end,
          'entry_count',
          coalesce((
            select count(*)
            from business.business_time_entries bte
            where bte.invoice_id = bi.id
          ), 0),
          'time_entry_ids',
          coalesce((
            select jsonb_agg(bte.id order by bte.work_date, bte.created_at)
            from business.business_time_entries bte
            where bte.invoice_id = bi.id
          ), '[]'::jsonb),
          'total_hours',
          coalesce((
            select sum(bte.hours)
            from business.business_time_entries bte
            where bte.invoice_id = bi.id
          ), 0),
          'total_amount',
          coalesce((
            select sum(
              bte.hours * coalesce(bte.hourly_rate, bse.default_hourly_rate, 0)
            )
            from business.business_time_entries bte
            where bte.invoice_id = bi.id
          ), 0)
        )
        order by bi.issued_on desc, bi.created_at desc
      )
      from (
        select *
        from business.business_invoices bi
        where bi.entity_id = p_entity_id
           or bi.engagement_id in (
             select id
             from business.business_service_engagements
             where client_entity_id = p_entity_id
           )
        order by bi.issued_on desc, bi.created_at desc
        limit 50
      ) bi
      join business.business_service_engagements bse
        on bse.id = bi.engagement_id
      left join public.entities provider_entity
        on provider_entity.id = bse.entity_id
      left join public.entities client_entity
        on client_entity.id = bse.client_entity_id
      left join public.profiles created_by
        on created_by.id = bi.created_by
    ), '[]'::jsonb),
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
          'completed_by_name', completed_by.full_name,
          'documents', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', brtd.id,
                'document_id', d.id,
                'title', d.title,
                'document_type', d.document_type,
                'mime_type', dv.mime_type,
                'created_at', brtd.created_at,
                'storage_bucket', dv.storage_bucket,
                'storage_path', dv.storage_path
              )
              order by brtd.created_at desc
            )
            from business.business_recurring_task_documents brtd
            join public.documents d
              on d.id = brtd.document_id
            left join public.document_versions dv
              on dv.id = d.current_version_id
            where brtd.task_id = brt.id
          ), '[]'::jsonb)
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
      'serviceEngagements', '[]'::jsonb,
      'timeEntries', '[]'::jsonb,
      'invoices', '[]'::jsonb,
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
