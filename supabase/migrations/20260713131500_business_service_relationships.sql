begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'document_type'
      and e.enumlabel = 'service_contract'
  ) then
    alter type public.document_type add value 'service_contract';
  end if;
end;
$$;

alter table business.business_service_engagements
  add column if not exists client_entity_id uuid,
  add column if not exists contract_document_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_service_engagements_client_entity_id_fkey'
  ) then
    alter table business.business_service_engagements
      add constraint business_service_engagements_client_entity_id_fkey
      foreign key (client_entity_id)
      references public.entities(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_service_engagements_contract_document_id_fkey'
  ) then
    alter table business.business_service_engagements
      add constraint business_service_engagements_contract_document_id_fkey
      foreign key (contract_document_id)
      references public.documents(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_service_engagements_entity_pair_chk'
  ) then
    alter table business.business_service_engagements
      add constraint business_service_engagements_entity_pair_chk
      check (
        client_entity_id is null
        or client_entity_id <> entity_id
      );
  end if;
end;
$$;

create index if not exists business_service_engagements_client_entity_idx
  on business.business_service_engagements (client_entity_id, is_active, title);

create index if not exists business_service_engagements_contract_document_idx
  on business.business_service_engagements (contract_document_id);

drop policy if exists business_service_engagements_select_entity_read on business.business_service_engagements;
create policy business_service_engagements_select_entity_read
on business.business_service_engagements
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.can_read_entity(entity_id, auth.uid())
  or (
    client_entity_id is not null
    and public.can_read_entity(client_entity_id, auth.uid())
  )
);

drop policy if exists business_time_entries_select_entity_read on business.business_time_entries;
create policy business_time_entries_select_entity_read
on business.business_time_entries
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.can_read_entity(entity_id, auth.uid())
  or exists (
    select 1
    from business.business_service_engagements bse
    where bse.id = business_time_entries.engagement_id
      and bse.client_entity_id is not null
      and public.can_read_entity(bse.client_entity_id, auth.uid())
  )
);

drop policy if exists business_invoices_select_entity_read on business.business_invoices;
create policy business_invoices_select_entity_read
on business.business_invoices
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.can_read_entity(entity_id, auth.uid())
  or exists (
    select 1
    from business.business_service_engagements bse
    where bse.id = business_invoices.engagement_id
      and bse.client_entity_id is not null
      and public.can_read_entity(bse.client_entity_id, auth.uid())
  )
);

drop function if exists public.create_entity_bookkeeping_service_engagement(
  uuid,
  text,
  text,
  text,
  numeric,
  text,
  integer,
  text,
  text,
  text,
  boolean,
  text
);

drop function if exists public.update_entity_bookkeeping_service_engagement(
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  text,
  integer,
  text,
  text,
  text,
  boolean,
  text
);

create or replace function public.create_entity_bookkeeping_service_engagement(
  p_entity_id uuid,
  p_title text,
  p_client_entity_id uuid,
  p_service_type text default 'bookkeeping',
  p_billing_model text default 'hourly',
  p_default_hourly_rate numeric default null,
  p_currency_code text default 'USD',
  p_invoice_terms_days integer default 30,
  p_invoice_prefix text default null,
  p_contact_name text default null,
  p_contact_email text default null,
  p_is_active boolean default true,
  p_notes text default null,
  p_contract_document_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_user_id uuid;
  v_row business.business_service_engagements%rowtype;
begin
  v_user_id := public.assert_business_bookkeeping_admin(p_entity_id);

  if p_client_entity_id is null then
    raise exception 'Client entity is required';
  end if;

  if p_client_entity_id = p_entity_id then
    raise exception 'Client entity must be different from provider entity';
  end if;

  if not exists (
    select 1
    from public.entities e
    where e.id = p_client_entity_id
      and e.entity_type = 'business'
  ) then
    raise exception 'Invalid client entity';
  end if;

  if p_contract_document_id is not null and not exists (
    select 1
    from public.documents d
    where d.id = p_contract_document_id
      and d.entity_id = p_entity_id
      and d.document_type = 'service_contract'
  ) then
    raise exception 'Invalid service contract document';
  end if;

  insert into business.business_service_engagements (
    entity_id,
    client_entity_id,
    title,
    service_type,
    billing_model,
    default_hourly_rate,
    currency_code,
    invoice_terms_days,
    invoice_prefix,
    contact_name,
    contact_email,
    is_active,
    notes,
    created_by,
    contract_document_id
  )
  values (
    p_entity_id,
    p_client_entity_id,
    p_title,
    p_service_type,
    p_billing_model,
    p_default_hourly_rate,
    upper(coalesce(nullif(p_currency_code, ''), 'USD')),
    coalesce(p_invoice_terms_days, 30),
    p_invoice_prefix,
    p_contact_name,
    p_contact_email,
    coalesce(p_is_active, true),
    p_notes,
    v_user_id,
    p_contract_document_id
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.create_entity_bookkeeping_service_engagement(uuid, text, uuid, text, text, numeric, text, integer, text, text, text, boolean, text, uuid) from public;
grant execute on function public.create_entity_bookkeeping_service_engagement(uuid, text, uuid, text, text, numeric, text, integer, text, text, text, boolean, text, uuid) to authenticated;

create or replace function public.update_entity_bookkeeping_service_engagement(
  p_entity_id uuid,
  p_engagement_id uuid,
  p_title text,
  p_client_entity_id uuid,
  p_service_type text default 'bookkeeping',
  p_billing_model text default 'hourly',
  p_default_hourly_rate numeric default null,
  p_currency_code text default 'USD',
  p_invoice_terms_days integer default 30,
  p_invoice_prefix text default null,
  p_contact_name text default null,
  p_contact_email text default null,
  p_is_active boolean default true,
  p_notes text default null,
  p_contract_document_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_row business.business_service_engagements%rowtype;
begin
  perform public.assert_business_bookkeeping_admin(p_entity_id);

  if p_client_entity_id is null then
    raise exception 'Client entity is required';
  end if;

  if p_client_entity_id = p_entity_id then
    raise exception 'Client entity must be different from provider entity';
  end if;

  if not exists (
    select 1
    from public.entities e
    where e.id = p_client_entity_id
      and e.entity_type = 'business'
  ) then
    raise exception 'Invalid client entity';
  end if;

  if p_contract_document_id is not null and not exists (
    select 1
    from public.documents d
    where d.id = p_contract_document_id
      and d.entity_id = p_entity_id
      and d.document_type = 'service_contract'
  ) then
    raise exception 'Invalid service contract document';
  end if;

  update business.business_service_engagements
  set
    title = p_title,
    client_entity_id = p_client_entity_id,
    service_type = p_service_type,
    billing_model = p_billing_model,
    default_hourly_rate = p_default_hourly_rate,
    currency_code = upper(coalesce(nullif(p_currency_code, ''), currency_code)),
    invoice_terms_days = coalesce(p_invoice_terms_days, invoice_terms_days),
    invoice_prefix = p_invoice_prefix,
    contact_name = p_contact_name,
    contact_email = p_contact_email,
    is_active = coalesce(p_is_active, true),
    notes = p_notes,
    contract_document_id = p_contract_document_id
  where id = p_engagement_id
    and entity_id = p_entity_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Service engagement not found';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.update_entity_bookkeeping_service_engagement(uuid, uuid, text, uuid, text, text, numeric, text, integer, text, text, text, boolean, text, uuid) from public;
grant execute on function public.update_entity_bookkeeping_service_engagement(uuid, uuid, text, uuid, text, text, numeric, text, integer, text, text, text, boolean, text, uuid) to authenticated;

create or replace function public.attach_entity_bookkeeping_contract_document(
  p_entity_id uuid,
  p_engagement_id uuid,
  p_document_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_row business.business_service_engagements%rowtype;
begin
  perform public.assert_business_bookkeeping_admin(p_entity_id);

  if not exists (
    select 1
    from public.documents d
    where d.id = p_document_id
      and d.entity_id = p_entity_id
      and d.document_type = 'service_contract'
  ) then
    raise exception 'Invalid service contract document';
  end if;

  update business.business_service_engagements
  set contract_document_id = p_document_id
  where id = p_engagement_id
    and entity_id = p_entity_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Service engagement not found';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.attach_entity_bookkeeping_contract_document(uuid, uuid, uuid) from public;
grant execute on function public.attach_entity_bookkeeping_contract_document(uuid, uuid, uuid) to authenticated;

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
      left join business.business_invoices bi
        on bi.id = bte.invoice_id
      left join public.entities provider_entity
        on provider_entity.id = bse.entity_id
      left join public.entities client_entity
        on client_entity.id = bse.client_entity_id
      left join public.profiles created_by
        on created_by.id = bte.created_by
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
