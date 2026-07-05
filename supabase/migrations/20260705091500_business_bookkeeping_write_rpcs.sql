create or replace function public.assert_business_bookkeeping_admin(
  p_entity_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
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
    public.is_global_admin(v_user_id)
    or public.is_entity_admin(v_user_id, p_entity_id)
  ) then
    raise exception 'Unauthorized';
  end if;

  return v_user_id;
end;
$$;

revoke all on function public.assert_business_bookkeeping_admin(uuid) from public;
grant execute on function public.assert_business_bookkeeping_admin(uuid) to authenticated;

create or replace function public.upsert_entity_bookkeeping_profile(
  p_entity_id uuid,
  p_legal_name text,
  p_dba_name text default null,
  p_ein text default null,
  p_state_of_formation text default null,
  p_entity_structure text default null,
  p_fiscal_year_end_month integer default null,
  p_fiscal_year_end_day integer default null,
  p_bookkeeping_status text default 'active',
  p_close_cadence text default 'monthly',
  p_default_accounting_basis text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, business
as $$
declare
  v_row business.business_profiles%rowtype;
begin
  perform public.assert_business_bookkeeping_admin(p_entity_id);

  insert into business.business_profiles (
    entity_id,
    legal_name,
    dba_name,
    ein,
    state_of_formation,
    entity_structure,
    fiscal_year_end_month,
    fiscal_year_end_day,
    bookkeeping_status,
    close_cadence,
    default_accounting_basis,
    notes
  )
  values (
    p_entity_id,
    p_legal_name,
    p_dba_name,
    p_ein,
    p_state_of_formation,
    p_entity_structure,
    p_fiscal_year_end_month,
    p_fiscal_year_end_day,
    p_bookkeeping_status,
    p_close_cadence,
    p_default_accounting_basis,
    p_notes
  )
  on conflict (entity_id) do update
  set
    legal_name = excluded.legal_name,
    dba_name = excluded.dba_name,
    ein = excluded.ein,
    state_of_formation = excluded.state_of_formation,
    entity_structure = excluded.entity_structure,
    fiscal_year_end_month = excluded.fiscal_year_end_month,
    fiscal_year_end_day = excluded.fiscal_year_end_day,
    bookkeeping_status = excluded.bookkeeping_status,
    close_cadence = excluded.close_cadence,
    default_accounting_basis = excluded.default_accounting_basis,
    notes = excluded.notes
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.upsert_entity_bookkeeping_profile(uuid, text, text, text, text, text, integer, integer, text, text, text, text) from public;
grant execute on function public.upsert_entity_bookkeeping_profile(uuid, text, text, text, text, text, integer, integer, text, text, text, text) to authenticated;

create or replace function public.create_entity_bookkeeping_system(
  p_entity_id uuid,
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
  v_user_id uuid;
  v_row business.business_systems%rowtype;
begin
  v_user_id := public.assert_business_bookkeeping_admin(p_entity_id);

  insert into business.business_systems (
    entity_id,
    system_type,
    system_name,
    vendor_name,
    external_org_id,
    environment,
    is_primary,
    status,
    owner_user_id,
    access_notes
  )
  values (
    p_entity_id,
    p_system_type,
    p_system_name,
    p_vendor_name,
    p_external_org_id,
    p_environment,
    coalesce(p_is_primary, false),
    p_status,
    v_user_id,
    p_access_notes
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.create_entity_bookkeeping_system(uuid, text, text, text, text, text, boolean, text, text) from public;
grant execute on function public.create_entity_bookkeeping_system(uuid, text, text, text, text, text, boolean, text, text) to authenticated;

create or replace function public.create_entity_bookkeeping_account(
  p_entity_id uuid,
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

  insert into business.business_financial_accounts (
    entity_id,
    system_id,
    account_type,
    account_name,
    institution_name,
    external_account_ref,
    masked_account_number,
    currency_code,
    is_active,
    is_reconcilable,
    reconciliation_cadence,
    notes
  )
  values (
    p_entity_id,
    p_system_id,
    p_account_type,
    p_account_name,
    p_institution_name,
    p_external_account_ref,
    p_masked_account_number,
    upper(coalesce(nullif(p_currency_code, ''), 'USD')),
    coalesce(p_is_active, true),
    coalesce(p_is_reconcilable, true),
    p_reconciliation_cadence,
    p_notes
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.create_entity_bookkeeping_account(uuid, uuid, text, text, text, text, text, text, boolean, boolean, text, text) from public;
grant execute on function public.create_entity_bookkeeping_account(uuid, uuid, text, text, text, text, text, text, boolean, boolean, text, text) to authenticated;

create or replace function public.create_entity_bookkeeping_responsibility(
  p_entity_id uuid,
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
  v_user_id uuid;
  v_row business.business_responsibilities%rowtype;
begin
  v_user_id := public.assert_business_bookkeeping_admin(p_entity_id);

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

  insert into business.business_responsibilities (
    entity_id,
    responsibility_type,
    user_id,
    contact_name,
    contact_email,
    contact_phone,
    system_id,
    account_id,
    is_primary,
    notes
  )
  values (
    p_entity_id,
    p_responsibility_type,
    v_user_id,
    p_contact_name,
    p_contact_email,
    p_contact_phone,
    p_system_id,
    p_account_id,
    coalesce(p_is_primary, true),
    p_notes
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.create_entity_bookkeeping_responsibility(uuid, text, text, text, text, uuid, uuid, boolean, text) from public;
grant execute on function public.create_entity_bookkeeping_responsibility(uuid, text, text, text, text, uuid, uuid, boolean, text) to authenticated;

create or replace function public.create_entity_bookkeeping_close_template(
  p_entity_id uuid,
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
  v_user_id uuid;
  v_row business.business_close_templates%rowtype;
begin
  v_user_id := public.assert_business_bookkeeping_admin(p_entity_id);

  insert into business.business_close_templates (
    entity_id,
    name,
    description,
    close_frequency,
    is_active,
    created_by
  )
  values (
    p_entity_id,
    p_name,
    p_description,
    p_close_frequency,
    coalesce(p_is_active, true),
    v_user_id
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.create_entity_bookkeeping_close_template(uuid, text, text, text, boolean) from public;
grant execute on function public.create_entity_bookkeeping_close_template(uuid, text, text, text, boolean) to authenticated;

create or replace function public.create_entity_bookkeeping_close_period(
  p_entity_id uuid,
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
  v_user_id uuid;
  v_row business.business_close_periods%rowtype;
begin
  v_user_id := public.assert_business_bookkeeping_admin(p_entity_id);

  insert into business.business_close_periods (
    entity_id,
    period_start,
    period_end,
    period_label,
    status,
    owner_user_id,
    notes
  )
  values (
    p_entity_id,
    p_period_start,
    p_period_end,
    p_period_label,
    p_status,
    v_user_id,
    p_notes
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.create_entity_bookkeeping_close_period(uuid, date, date, text, text, text) from public;
grant execute on function public.create_entity_bookkeeping_close_period(uuid, date, date, text, text, text) to authenticated;
