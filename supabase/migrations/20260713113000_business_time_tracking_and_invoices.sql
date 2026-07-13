begin;

create table if not exists business.business_service_engagements (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null
    constraint business_service_engagements_entity_id_fkey
    references public.entities(id) on delete cascade,
  title text not null,
  service_type text not null default 'bookkeeping'
    check (
      service_type in (
        'bookkeeping',
        'advisory',
        'fractional_finance',
        'operations',
        'other'
      )
    ),
  billing_model text not null default 'hourly'
    check (billing_model in ('hourly', 'fixed_fee', 'retainer')),
  default_hourly_rate numeric(10, 2)
    check (default_hourly_rate is null or default_hourly_rate >= 0),
  currency_code text not null default 'USD',
  invoice_terms_days integer not null default 30
    check (invoice_terms_days between 0 and 180),
  invoice_prefix text,
  contact_name text,
  contact_email text,
  is_active boolean not null default true,
  notes text,
  created_by uuid
    constraint business_service_engagements_created_by_fkey
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business.business_invoices (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null
    constraint business_invoices_entity_id_fkey
    references public.entities(id) on delete cascade,
  engagement_id uuid not null
    constraint business_invoices_engagement_id_fkey
    references business.business_service_engagements(id) on delete cascade,
  invoice_number text not null,
  period_start date,
  period_end date,
  issued_on date not null,
  due_on date,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'paid', 'void')),
  notes text,
  created_by uuid
    constraint business_invoices_created_by_fkey
    references public.profiles(id) on delete set null,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_invoices_entity_invoice_number_key
    unique (entity_id, invoice_number),
  constraint business_invoices_period_window_chk
    check (
      period_start is null
      or period_end is null
      or period_end >= period_start
    ),
  constraint business_invoices_paid_status_chk
    check (paid_at is null or status = 'paid')
);

create table if not exists business.business_time_entries (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null
    constraint business_time_entries_entity_id_fkey
    references public.entities(id) on delete cascade,
  engagement_id uuid not null
    constraint business_time_entries_engagement_id_fkey
    references business.business_service_engagements(id) on delete cascade,
  invoice_id uuid
    constraint business_time_entries_invoice_id_fkey
    references business.business_invoices(id) on delete set null,
  work_date date not null,
  hours numeric(6, 2) not null
    check (hours > 0 and hours <= 24),
  hourly_rate numeric(10, 2)
    check (hourly_rate is null or hourly_rate >= 0),
  description text not null,
  billable boolean not null default true,
  created_by uuid
    constraint business_time_entries_created_by_fkey
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_time_entries_nonbillable_invoice_chk
    check (billable or invoice_id is null)
);

create index if not exists business_service_engagements_entity_idx
  on business.business_service_engagements (entity_id, is_active, title);

create index if not exists business_invoices_entity_idx
  on business.business_invoices (entity_id, issued_on desc, status);

create index if not exists business_invoices_engagement_idx
  on business.business_invoices (engagement_id, issued_on desc);

create index if not exists business_time_entries_entity_idx
  on business.business_time_entries (entity_id, work_date desc);

create index if not exists business_time_entries_engagement_idx
  on business.business_time_entries (engagement_id, work_date desc);

create index if not exists business_time_entries_invoice_idx
  on business.business_time_entries (invoice_id);

drop trigger if exists trg_business_service_engagements_updated_at on business.business_service_engagements;
create trigger trg_business_service_engagements_updated_at
before update on business.business_service_engagements
for each row execute function public.set_updated_at();

drop trigger if exists trg_business_invoices_updated_at on business.business_invoices;
create trigger trg_business_invoices_updated_at
before update on business.business_invoices
for each row execute function public.set_updated_at();

drop trigger if exists trg_business_time_entries_updated_at on business.business_time_entries;
create trigger trg_business_time_entries_updated_at
before update on business.business_time_entries
for each row execute function public.set_updated_at();

grant select, insert, update, delete on business.business_service_engagements to authenticated;
grant all on business.business_service_engagements to service_role;
grant select, insert, update, delete on business.business_invoices to authenticated;
grant all on business.business_invoices to service_role;
grant select, insert, update, delete on business.business_time_entries to authenticated;
grant all on business.business_time_entries to service_role;

alter table business.business_service_engagements enable row level security;
alter table business.business_invoices enable row level security;
alter table business.business_time_entries enable row level security;

drop policy if exists business_service_engagements_select_entity_read on business.business_service_engagements;
create policy business_service_engagements_select_entity_read
on business.business_service_engagements
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.can_read_entity(entity_id, auth.uid())
);

drop policy if exists business_service_engagements_insert_entity_admin on business.business_service_engagements;
create policy business_service_engagements_insert_entity_admin
on business.business_service_engagements
for insert
to authenticated
with check (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

drop policy if exists business_service_engagements_update_entity_admin on business.business_service_engagements;
create policy business_service_engagements_update_entity_admin
on business.business_service_engagements
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

drop policy if exists business_service_engagements_delete_entity_admin on business.business_service_engagements;
create policy business_service_engagements_delete_entity_admin
on business.business_service_engagements
for delete
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

drop policy if exists business_invoices_select_entity_read on business.business_invoices;
create policy business_invoices_select_entity_read
on business.business_invoices
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.can_read_entity(entity_id, auth.uid())
);

drop policy if exists business_invoices_insert_entity_admin on business.business_invoices;
create policy business_invoices_insert_entity_admin
on business.business_invoices
for insert
to authenticated
with check (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

drop policy if exists business_invoices_update_entity_admin on business.business_invoices;
create policy business_invoices_update_entity_admin
on business.business_invoices
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

drop policy if exists business_invoices_delete_entity_admin on business.business_invoices;
create policy business_invoices_delete_entity_admin
on business.business_invoices
for delete
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

drop policy if exists business_time_entries_select_entity_read on business.business_time_entries;
create policy business_time_entries_select_entity_read
on business.business_time_entries
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.can_read_entity(entity_id, auth.uid())
);

drop policy if exists business_time_entries_insert_entity_admin on business.business_time_entries;
create policy business_time_entries_insert_entity_admin
on business.business_time_entries
for insert
to authenticated
with check (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

drop policy if exists business_time_entries_update_entity_admin on business.business_time_entries;
create policy business_time_entries_update_entity_admin
on business.business_time_entries
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

drop policy if exists business_time_entries_delete_entity_admin on business.business_time_entries;
create policy business_time_entries_delete_entity_admin
on business.business_time_entries
for delete
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

create or replace function public.sync_entity_invoice_time_entries(
  p_entity_id uuid,
  p_invoice_id uuid,
  p_engagement_id uuid,
  p_time_entry_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_time_entry_ids uuid[] := coalesce(p_time_entry_ids, '{}'::uuid[]);
begin
  if exists (
    select 1
    from unnest(v_time_entry_ids) selected_id
    left join business.business_time_entries bte
      on bte.id = selected_id
    where bte.id is null
      or bte.entity_id <> p_entity_id
      or bte.engagement_id <> p_engagement_id
      or not bte.billable
      or (bte.invoice_id is not null and bte.invoice_id <> p_invoice_id)
  ) then
    raise exception 'Invalid time entries for invoice';
  end if;

  update business.business_time_entries
  set invoice_id = null
  where entity_id = p_entity_id
    and invoice_id = p_invoice_id
    and not (id = any (v_time_entry_ids));

  if array_length(v_time_entry_ids, 1) is not null then
    update business.business_time_entries
    set invoice_id = p_invoice_id
    where id = any (v_time_entry_ids)
      and entity_id = p_entity_id;
  end if;
end;
$$;

revoke all on function public.sync_entity_invoice_time_entries(uuid, uuid, uuid, uuid[]) from public;
grant execute on function public.sync_entity_invoice_time_entries(uuid, uuid, uuid, uuid[]) to authenticated;

create or replace function public.create_entity_bookkeeping_service_engagement(
  p_entity_id uuid,
  p_title text,
  p_service_type text default 'bookkeeping',
  p_billing_model text default 'hourly',
  p_default_hourly_rate numeric default null,
  p_currency_code text default 'USD',
  p_invoice_terms_days integer default 30,
  p_invoice_prefix text default null,
  p_contact_name text default null,
  p_contact_email text default null,
  p_is_active boolean default true,
  p_notes text default null
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

  insert into business.business_service_engagements (
    entity_id,
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
    created_by
  )
  values (
    p_entity_id,
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
    v_user_id
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.create_entity_bookkeeping_service_engagement(uuid, text, text, text, numeric, text, integer, text, text, text, boolean, text) from public;
grant execute on function public.create_entity_bookkeeping_service_engagement(uuid, text, text, text, numeric, text, integer, text, text, text, boolean, text) to authenticated;

create or replace function public.update_entity_bookkeeping_service_engagement(
  p_entity_id uuid,
  p_engagement_id uuid,
  p_title text,
  p_service_type text default 'bookkeeping',
  p_billing_model text default 'hourly',
  p_default_hourly_rate numeric default null,
  p_currency_code text default 'USD',
  p_invoice_terms_days integer default 30,
  p_invoice_prefix text default null,
  p_contact_name text default null,
  p_contact_email text default null,
  p_is_active boolean default true,
  p_notes text default null
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

  update business.business_service_engagements
  set
    title = p_title,
    service_type = p_service_type,
    billing_model = p_billing_model,
    default_hourly_rate = p_default_hourly_rate,
    currency_code = upper(coalesce(nullif(p_currency_code, ''), currency_code)),
    invoice_terms_days = coalesce(p_invoice_terms_days, invoice_terms_days),
    invoice_prefix = p_invoice_prefix,
    contact_name = p_contact_name,
    contact_email = p_contact_email,
    is_active = coalesce(p_is_active, true),
    notes = p_notes
  where id = p_engagement_id
    and entity_id = p_entity_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Service engagement not found';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.update_entity_bookkeeping_service_engagement(uuid, uuid, text, text, text, numeric, text, integer, text, text, text, boolean, text) from public;
grant execute on function public.update_entity_bookkeeping_service_engagement(uuid, uuid, text, text, text, numeric, text, integer, text, text, text, boolean, text) to authenticated;

create or replace function public.create_entity_bookkeeping_time_entry(
  p_entity_id uuid,
  p_engagement_id uuid,
  p_work_date date,
  p_hours numeric,
  p_hourly_rate numeric default null,
  p_description text default null,
  p_billable boolean default true,
  p_invoice_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_user_id uuid;
  v_row business.business_time_entries%rowtype;
begin
  v_user_id := public.assert_business_bookkeeping_admin(p_entity_id);

  if not exists (
    select 1
    from business.business_service_engagements bse
    where bse.id = p_engagement_id
      and bse.entity_id = p_entity_id
  ) then
    raise exception 'Invalid service engagement for entity';
  end if;

  if p_invoice_id is not null and not exists (
    select 1
    from business.business_invoices bi
    where bi.id = p_invoice_id
      and bi.entity_id = p_entity_id
      and bi.engagement_id = p_engagement_id
  ) then
    raise exception 'Invalid invoice for entity';
  end if;

  if coalesce(p_billable, true) = false and p_invoice_id is not null then
    raise exception 'Non-billable time cannot be attached to an invoice';
  end if;

  insert into business.business_time_entries (
    entity_id,
    engagement_id,
    invoice_id,
    work_date,
    hours,
    hourly_rate,
    description,
    billable,
    created_by
  )
  values (
    p_entity_id,
    p_engagement_id,
    p_invoice_id,
    p_work_date,
    p_hours,
    p_hourly_rate,
    coalesce(nullif(p_description, ''), 'Work entry'),
    coalesce(p_billable, true),
    v_user_id
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.create_entity_bookkeeping_time_entry(uuid, uuid, date, numeric, numeric, text, boolean, uuid) from public;
grant execute on function public.create_entity_bookkeeping_time_entry(uuid, uuid, date, numeric, numeric, text, boolean, uuid) to authenticated;

create or replace function public.update_entity_bookkeeping_time_entry(
  p_entity_id uuid,
  p_time_entry_id uuid,
  p_engagement_id uuid,
  p_work_date date,
  p_hours numeric,
  p_hourly_rate numeric default null,
  p_description text default null,
  p_billable boolean default true,
  p_invoice_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_row business.business_time_entries%rowtype;
begin
  perform public.assert_business_bookkeeping_admin(p_entity_id);

  if not exists (
    select 1
    from business.business_service_engagements bse
    where bse.id = p_engagement_id
      and bse.entity_id = p_entity_id
  ) then
    raise exception 'Invalid service engagement for entity';
  end if;

  if p_invoice_id is not null and not exists (
    select 1
    from business.business_invoices bi
    where bi.id = p_invoice_id
      and bi.entity_id = p_entity_id
      and bi.engagement_id = p_engagement_id
  ) then
    raise exception 'Invalid invoice for entity';
  end if;

  if coalesce(p_billable, true) = false and p_invoice_id is not null then
    raise exception 'Non-billable time cannot be attached to an invoice';
  end if;

  update business.business_time_entries
  set
    engagement_id = p_engagement_id,
    invoice_id = p_invoice_id,
    work_date = p_work_date,
    hours = p_hours,
    hourly_rate = p_hourly_rate,
    description = coalesce(nullif(p_description, ''), description),
    billable = coalesce(p_billable, true)
  where id = p_time_entry_id
    and entity_id = p_entity_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Time entry not found';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.update_entity_bookkeeping_time_entry(uuid, uuid, uuid, date, numeric, numeric, text, boolean, uuid) from public;
grant execute on function public.update_entity_bookkeeping_time_entry(uuid, uuid, uuid, date, numeric, numeric, text, boolean, uuid) to authenticated;

create or replace function public.create_entity_bookkeeping_invoice(
  p_entity_id uuid,
  p_engagement_id uuid,
  p_invoice_number text,
  p_period_start date default null,
  p_period_end date default null,
  p_issued_on date default null,
  p_due_on date default null,
  p_status text default 'draft',
  p_notes text default null,
  p_time_entry_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_user_id uuid;
  v_terms_days integer;
  v_due_on date;
  v_row business.business_invoices%rowtype;
begin
  v_user_id := public.assert_business_bookkeeping_admin(p_entity_id);

  select invoice_terms_days
  into v_terms_days
  from business.business_service_engagements
  where id = p_engagement_id
    and entity_id = p_entity_id;

  if v_terms_days is null then
    raise exception 'Invalid service engagement for entity';
  end if;

  v_due_on := coalesce(p_due_on, coalesce(p_issued_on, current_date) + v_terms_days);

  insert into business.business_invoices (
    entity_id,
    engagement_id,
    invoice_number,
    period_start,
    period_end,
    issued_on,
    due_on,
    status,
    notes,
    created_by,
    sent_at,
    paid_at
  )
  values (
    p_entity_id,
    p_engagement_id,
    p_invoice_number,
    p_period_start,
    p_period_end,
    coalesce(p_issued_on, current_date),
    v_due_on,
    p_status,
    p_notes,
    v_user_id,
    case when p_status in ('sent', 'paid') then now() else null end,
    case when p_status = 'paid' then now() else null end
  )
  returning * into v_row;

  perform public.sync_entity_invoice_time_entries(
    p_entity_id,
    v_row.id,
    p_engagement_id,
    p_time_entry_ids
  );

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.create_entity_bookkeeping_invoice(uuid, uuid, text, date, date, date, date, text, text, uuid[]) from public;
grant execute on function public.create_entity_bookkeeping_invoice(uuid, uuid, text, date, date, date, date, text, text, uuid[]) to authenticated;

create or replace function public.update_entity_bookkeeping_invoice(
  p_entity_id uuid,
  p_invoice_id uuid,
  p_engagement_id uuid,
  p_invoice_number text,
  p_period_start date default null,
  p_period_end date default null,
  p_issued_on date default null,
  p_due_on date default null,
  p_status text default 'draft',
  p_notes text default null,
  p_time_entry_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_terms_days integer;
  v_row business.business_invoices%rowtype;
begin
  perform public.assert_business_bookkeeping_admin(p_entity_id);

  select invoice_terms_days
  into v_terms_days
  from business.business_service_engagements
  where id = p_engagement_id
    and entity_id = p_entity_id;

  if v_terms_days is null then
    raise exception 'Invalid service engagement for entity';
  end if;

  update business.business_invoices
  set
    engagement_id = p_engagement_id,
    invoice_number = p_invoice_number,
    period_start = p_period_start,
    period_end = p_period_end,
    issued_on = coalesce(p_issued_on, issued_on),
    due_on = coalesce(p_due_on, coalesce(p_issued_on, issued_on, current_date) + v_terms_days),
    status = p_status,
    notes = p_notes,
    sent_at = case
      when p_status in ('sent', 'paid') then coalesce(sent_at, now())
      else sent_at
    end,
    paid_at = case
      when p_status = 'paid' then coalesce(paid_at, now())
      when p_status <> 'paid' then null
      else paid_at
    end
  where id = p_invoice_id
    and entity_id = p_entity_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Invoice not found';
  end if;

  perform public.sync_entity_invoice_time_entries(
    p_entity_id,
    p_invoice_id,
    p_engagement_id,
    p_time_entry_ids
  );

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.update_entity_bookkeeping_invoice(uuid, uuid, uuid, text, date, date, date, date, text, text, uuid[]) from public;
grant execute on function public.update_entity_bookkeeping_invoice(uuid, uuid, uuid, text, date, date, date, date, text, text, uuid[]) to authenticated;

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
      where bse.entity_id = p_entity_id
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
        order by work_date desc, created_at desc
        limit 250
      ) bte
      left join business.business_service_engagements bse
        on bse.id = bte.engagement_id
      left join business.business_invoices bi
        on bi.id = bte.invoice_id
      left join public.profiles created_by
        on created_by.id = bte.created_by
    ), '[]'::jsonb),
    'invoices',
    coalesce((
      select jsonb_agg(
        to_jsonb(bi) || jsonb_build_object(
          'engagement_title', bse.title,
          'created_by_name', created_by.full_name,
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
        from business.business_invoices
        where entity_id = p_entity_id
        order by issued_on desc, created_at desc
        limit 50
      ) bi
      left join business.business_service_engagements bse
        on bse.id = bi.engagement_id
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
