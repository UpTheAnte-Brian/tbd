-- Invoice numbers are unique for an entire provider business, not just for an
-- individual service engagement. Return an actionable error before the table
-- constraint is reached so users can correct a manually entered duplicate.

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

  if exists (
    select 1
    from business.business_invoices
    where entity_id = p_entity_id
      and invoice_number = p_invoice_number
  ) then
    raise exception 'Invoice number "%" already exists for this business', p_invoice_number
      using errcode = '23505';
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

  if exists (
    select 1
    from business.business_invoices
    where entity_id = p_entity_id
      and invoice_number = p_invoice_number
      and id <> p_invoice_id
  ) then
    raise exception 'Invoice number "%" already exists for this business', p_invoice_number
      using errcode = '23505';
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
