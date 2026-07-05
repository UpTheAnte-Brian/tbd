create or replace function public.update_entity_bookkeeping_system(
  p_entity_id uuid,
  p_system_id uuid,
  p_system_type text,
  p_system_name text,
  p_vendor_name text default null,
  p_external_org_id text default null,
  p_environment text default null,
  p_is_primary boolean default false,
  p_status text default 'active',
  p_access_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_row business.business_systems%rowtype;
begin
  perform public.assert_business_bookkeeping_admin(p_entity_id);

  update business.business_systems
  set
    system_type = p_system_type,
    system_name = p_system_name,
    vendor_name = p_vendor_name,
    external_org_id = p_external_org_id,
    environment = p_environment,
    is_primary = coalesce(p_is_primary, false),
    status = p_status,
    access_notes = p_access_notes
  where id = p_system_id
    and entity_id = p_entity_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'System not found';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.update_entity_bookkeeping_system(uuid, uuid, text, text, text, text, text, boolean, text, text) from public;
grant execute on function public.update_entity_bookkeeping_system(uuid, uuid, text, text, text, text, text, boolean, text, text) to authenticated;

create or replace function public.update_entity_bookkeeping_account(
  p_entity_id uuid,
  p_account_id uuid,
  p_system_id uuid,
  p_account_type text,
  p_account_name text,
  p_institution_name text,
  p_external_account_ref text,
  p_masked_account_number text,
  p_currency_code text,
  p_is_active boolean,
  p_is_reconcilable boolean,
  p_reconciliation_cadence text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_row business.business_financial_accounts%rowtype;
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

  update business.business_financial_accounts
  set
    system_id = p_system_id,
    account_type = p_account_type,
    account_name = p_account_name,
    institution_name = p_institution_name,
    external_account_ref = p_external_account_ref,
    masked_account_number = p_masked_account_number,
    currency_code = upper(coalesce(nullif(p_currency_code, ''), 'USD')),
    is_active = coalesce(p_is_active, true),
    is_reconcilable = coalesce(p_is_reconcilable, true),
    reconciliation_cadence = p_reconciliation_cadence,
    notes = p_notes
  where id = p_account_id
    and entity_id = p_entity_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Account not found';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.update_entity_bookkeeping_account(uuid, uuid, uuid, text, text, text, text, text, text, boolean, boolean, text, text) from public;
grant execute on function public.update_entity_bookkeeping_account(uuid, uuid, uuid, text, text, text, text, text, text, boolean, boolean, text, text) to authenticated;

create or replace function public.update_entity_bookkeeping_responsibility(
  p_entity_id uuid,
  p_responsibility_id uuid,
  p_responsibility_type text,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_system_id uuid,
  p_account_id uuid,
  p_is_primary boolean,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_row business.business_responsibilities%rowtype;
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

  update business.business_responsibilities
  set
    responsibility_type = p_responsibility_type,
    contact_name = p_contact_name,
    contact_email = p_contact_email,
    contact_phone = p_contact_phone,
    system_id = p_system_id,
    account_id = p_account_id,
    is_primary = coalesce(p_is_primary, true),
    notes = p_notes
  where id = p_responsibility_id
    and entity_id = p_entity_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Responsibility not found';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.update_entity_bookkeeping_responsibility(uuid, uuid, text, text, text, text, uuid, uuid, boolean, text) from public;
grant execute on function public.update_entity_bookkeeping_responsibility(uuid, uuid, text, text, text, text, uuid, uuid, boolean, text) to authenticated;

create or replace function public.update_entity_bookkeeping_close_template(
  p_entity_id uuid,
  p_template_id uuid,
  p_name text,
  p_description text default null,
  p_close_frequency text default 'monthly',
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_row business.business_close_templates%rowtype;
begin
  perform public.assert_business_bookkeeping_admin(p_entity_id);

  update business.business_close_templates
  set
    name = p_name,
    description = p_description,
    close_frequency = p_close_frequency,
    is_active = coalesce(p_is_active, true)
  where id = p_template_id
    and entity_id = p_entity_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Close template not found';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.update_entity_bookkeeping_close_template(uuid, uuid, text, text, text, boolean) from public;
grant execute on function public.update_entity_bookkeeping_close_template(uuid, uuid, text, text, text, boolean) to authenticated;

create or replace function public.update_entity_bookkeeping_close_period(
  p_entity_id uuid,
  p_close_period_id uuid,
  p_period_start date,
  p_period_end date,
  p_period_label text,
  p_status text default 'open',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_row business.business_close_periods%rowtype;
begin
  perform public.assert_business_bookkeeping_admin(p_entity_id);

  update business.business_close_periods
  set
    period_start = p_period_start,
    period_end = p_period_end,
    period_label = p_period_label,
    status = p_status,
    notes = p_notes
  where id = p_close_period_id
    and entity_id = p_entity_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Close period not found';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.update_entity_bookkeeping_close_period(uuid, uuid, date, date, text, text, text) from public;
grant execute on function public.update_entity_bookkeeping_close_period(uuid, uuid, date, date, text, text, text) to authenticated;
