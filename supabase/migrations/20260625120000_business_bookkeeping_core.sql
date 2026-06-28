begin;

create schema if not exists business;

grant usage on schema business to authenticated;
grant usage on schema business to service_role;

create table if not exists business.business_profiles (
  entity_id uuid primary key
    references public.entities(id) on delete cascade,
  legal_name text not null,
  dba_name text,
  ein text,
  state_of_formation text,
  entity_structure text,
  fiscal_year_end_month integer
    check (fiscal_year_end_month between 1 and 12),
  fiscal_year_end_day integer
    check (fiscal_year_end_day between 1 and 31),
  bookkeeping_status text not null default 'active'
    check (bookkeeping_status in ('active', 'paused', 'archived')),
  close_cadence text not null default 'monthly'
    check (close_cadence in ('monthly', 'quarterly', 'annual', 'ad_hoc')),
  default_accounting_basis text
    check (default_accounting_basis in ('cash', 'accrual', 'hybrid')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_profiles_fiscal_year_pair_chk
    check (
      (fiscal_year_end_month is null and fiscal_year_end_day is null)
      or (fiscal_year_end_month is not null and fiscal_year_end_day is not null)
    )
);

create table if not exists business.business_systems (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null
    constraint business_systems_entity_id_fkey
    references public.entities(id) on delete cascade,
  system_type text not null
    check (
      system_type in (
        'accounting',
        'bank',
        'credit_card',
        'payroll',
        'merchant_processor',
        'sales_tax',
        'erp',
        'inventory',
        'pos',
        'document_storage'
      )
    ),
  system_name text not null,
  vendor_name text,
  external_org_id text,
  environment text,
  is_primary boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'retired')),
  owner_person_role_id uuid
    constraint business_systems_owner_person_role_id_fkey
    references public.entity_person_roles(id) on delete set null,
  owner_user_id uuid
    constraint business_systems_owner_user_id_fkey
    references public.profiles(id) on delete set null,
  access_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business.business_financial_accounts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null
    constraint business_financial_accounts_entity_id_fkey
    references public.entities(id) on delete cascade,
  system_id uuid
    constraint business_financial_accounts_system_id_fkey
    references business.business_systems(id) on delete set null,
  account_type text not null
    check (
      account_type in (
        'checking',
        'savings',
        'credit_card',
        'loan',
        'line_of_credit',
        'merchant_settlement',
        'petty_cash',
        'clearing'
      )
    ),
  account_name text not null,
  institution_name text,
  external_account_ref text,
  masked_account_number text,
  currency_code text not null default 'USD',
  is_active boolean not null default true,
  is_reconcilable boolean not null default true,
  reconciliation_cadence text not null default 'monthly'
    check (reconciliation_cadence in ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'ad_hoc')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business.business_responsibilities (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null
    constraint business_responsibilities_entity_id_fkey
    references public.entities(id) on delete cascade,
  responsibility_type text not null
    check (
      responsibility_type in (
        'owner',
        'bookkeeper',
        'reconciler',
        'depositor',
        'payroll_processor',
        'sales_tax_filer',
        'cpa',
        'approver',
        'bank_admin',
        'qb_admin'
      )
    ),
  person_role_id uuid
    constraint business_responsibilities_person_role_id_fkey
    references public.entity_person_roles(id) on delete set null,
  user_id uuid
    constraint business_responsibilities_user_id_fkey
    references public.profiles(id) on delete set null,
  contact_name text,
  contact_email text,
  contact_phone text,
  system_id uuid
    constraint business_responsibilities_system_id_fkey
    references business.business_systems(id) on delete set null,
  account_id uuid
    constraint business_responsibilities_account_id_fkey
    references business.business_financial_accounts(id) on delete set null,
  is_primary boolean not null default true,
  starts_on date,
  ends_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_responsibilities_date_window_chk
    check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table if not exists business.business_close_templates (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null
    constraint business_close_templates_entity_id_fkey
    references public.entities(id) on delete cascade,
  name text not null,
  description text,
  close_frequency text not null default 'monthly'
    check (close_frequency in ('monthly', 'quarterly', 'annual', 'ad_hoc')),
  is_active boolean not null default true,
  created_by uuid
    constraint business_close_templates_created_by_fkey
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business.business_close_template_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null
    constraint business_close_template_tasks_template_id_fkey
    references business.business_close_templates(id) on delete cascade,
  task_key text not null,
  title text not null,
  description text,
  task_type text not null
    check (
      task_type in (
        'bank_reconciliation',
        'credit_card_reconciliation',
        'sales_posting_review',
        'payroll_entry_review',
        'merchant_deposit_tie_out',
        'sales_tax_filing',
        'journal_entry_review',
        'financial_package_prepare',
        'owner_review'
      )
    ),
  sort_order integer not null default 100,
  default_due_day integer
    check (default_due_day between 1 and 31),
  responsibility_type text,
  system_id uuid
    constraint business_close_template_tasks_system_id_fkey
    references business.business_systems(id) on delete set null,
  account_id uuid
    constraint business_close_template_tasks_account_id_fkey
    references business.business_financial_accounts(id) on delete set null,
  is_required boolean not null default true,
  evidence_hint text,
  created_at timestamptz not null default now(),
  constraint business_close_template_tasks_template_task_key_key
    unique (template_id, task_key)
);

create table if not exists business.business_close_periods (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null
    constraint business_close_periods_entity_id_fkey
    references public.entities(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  period_label text not null,
  status text not null default 'open'
    check (status in ('open', 'in_review', 'closed', 'blocked')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  locked_at timestamptz,
  owner_user_id uuid
    constraint business_close_periods_owner_user_id_fkey
    references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_close_periods_window_chk
    check (period_end >= period_start),
  constraint business_close_periods_entity_period_key
    unique (entity_id, period_start, period_end)
);

create table if not exists business.business_close_tasks (
  id uuid primary key default gen_random_uuid(),
  close_period_id uuid not null
    constraint business_close_tasks_close_period_id_fkey
    references business.business_close_periods(id) on delete cascade,
  template_task_id uuid
    constraint business_close_tasks_template_task_id_fkey
    references business.business_close_template_tasks(id) on delete set null,
  entity_id uuid not null
    constraint business_close_tasks_entity_id_fkey
    references public.entities(id) on delete cascade,
  title text not null,
  task_type text not null
    check (
      task_type in (
        'bank_reconciliation',
        'credit_card_reconciliation',
        'sales_posting_review',
        'payroll_entry_review',
        'merchant_deposit_tie_out',
        'sales_tax_filing',
        'journal_entry_review',
        'financial_package_prepare',
        'owner_review'
      )
    ),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'blocked', 'done', 'skipped')),
  assigned_user_id uuid
    constraint business_close_tasks_assigned_user_id_fkey
    references public.profiles(id) on delete set null,
  assigned_person_role_id uuid
    constraint business_close_tasks_assigned_person_role_id_fkey
    references public.entity_person_roles(id) on delete set null,
  system_id uuid
    constraint business_close_tasks_system_id_fkey
    references business.business_systems(id) on delete set null,
  account_id uuid
    constraint business_close_tasks_account_id_fkey
    references business.business_financial_accounts(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  completed_by uuid
    constraint business_close_tasks_completed_by_fkey
    references public.profiles(id) on delete set null,
  blocker_reason text,
  notes text,
  evidence_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_systems_entity_idx
  on business.business_systems (entity_id, system_type, system_name);

create index if not exists business_financial_accounts_entity_idx
  on business.business_financial_accounts (entity_id, account_type, account_name);

create index if not exists business_financial_accounts_system_idx
  on business.business_financial_accounts (system_id);

create index if not exists business_responsibilities_entity_idx
  on business.business_responsibilities (entity_id, responsibility_type, is_primary desc);

create index if not exists business_responsibilities_system_idx
  on business.business_responsibilities (system_id);

create index if not exists business_responsibilities_account_idx
  on business.business_responsibilities (account_id);

create index if not exists business_close_templates_entity_idx
  on business.business_close_templates (entity_id, is_active);

create index if not exists business_close_template_tasks_template_idx
  on business.business_close_template_tasks (template_id, sort_order, title);

create index if not exists business_close_periods_entity_idx
  on business.business_close_periods (entity_id, period_end desc);

create index if not exists business_close_tasks_period_idx
  on business.business_close_tasks (close_period_id, status, due_date);

create index if not exists business_close_tasks_entity_idx
  on business.business_close_tasks (entity_id, status);

drop trigger if exists trg_business_profiles_updated_at on business.business_profiles;
create trigger trg_business_profiles_updated_at
before update on business.business_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_business_systems_updated_at on business.business_systems;
create trigger trg_business_systems_updated_at
before update on business.business_systems
for each row execute function public.set_updated_at();

drop trigger if exists trg_business_financial_accounts_updated_at on business.business_financial_accounts;
create trigger trg_business_financial_accounts_updated_at
before update on business.business_financial_accounts
for each row execute function public.set_updated_at();

drop trigger if exists trg_business_responsibilities_updated_at on business.business_responsibilities;
create trigger trg_business_responsibilities_updated_at
before update on business.business_responsibilities
for each row execute function public.set_updated_at();

drop trigger if exists trg_business_close_templates_updated_at on business.business_close_templates;
create trigger trg_business_close_templates_updated_at
before update on business.business_close_templates
for each row execute function public.set_updated_at();

drop trigger if exists trg_business_close_periods_updated_at on business.business_close_periods;
create trigger trg_business_close_periods_updated_at
before update on business.business_close_periods
for each row execute function public.set_updated_at();

drop trigger if exists trg_business_close_tasks_updated_at on business.business_close_tasks;
create trigger trg_business_close_tasks_updated_at
before update on business.business_close_tasks
for each row execute function public.set_updated_at();

grant select, insert, update, delete on all tables in schema business to authenticated;
grant all on all tables in schema business to service_role;

alter table business.business_profiles enable row level security;
alter table business.business_systems enable row level security;
alter table business.business_financial_accounts enable row level security;
alter table business.business_responsibilities enable row level security;
alter table business.business_close_templates enable row level security;
alter table business.business_close_template_tasks enable row level security;
alter table business.business_close_periods enable row level security;
alter table business.business_close_tasks enable row level security;

do $$
declare
  table_name text;
begin
  for table_name in
    select unnest(
      array[
        'business_profiles',
        'business_systems',
        'business_financial_accounts',
        'business_responsibilities',
        'business_close_templates',
        'business_close_periods',
        'business_close_tasks'
      ]::text[]
    )
  loop
    execute format(
      'drop policy if exists %I on business.%I',
      table_name || '_select_entity_read',
      table_name
    );
    execute format(
      'create policy %I on business.%I for select to authenticated using (public.is_global_admin(auth.uid()) or public.can_read_entity(entity_id, auth.uid()))',
      table_name || '_select_entity_read',
      table_name
    );

    execute format(
      'drop policy if exists %I on business.%I',
      table_name || '_insert_entity_admin',
      table_name
    );
    execute format(
      'create policy %I on business.%I for insert to authenticated with check (public.is_global_admin(auth.uid()) or public.is_entity_admin(auth.uid(), entity_id))',
      table_name || '_insert_entity_admin',
      table_name
    );

    execute format(
      'drop policy if exists %I on business.%I',
      table_name || '_update_entity_admin',
      table_name
    );
    execute format(
      'create policy %I on business.%I for update to authenticated using (public.is_global_admin(auth.uid()) or public.is_entity_admin(auth.uid(), entity_id)) with check (public.is_global_admin(auth.uid()) or public.is_entity_admin(auth.uid(), entity_id))',
      table_name || '_update_entity_admin',
      table_name
    );

    execute format(
      'drop policy if exists %I on business.%I',
      table_name || '_delete_entity_admin',
      table_name
    );
    execute format(
      'create policy %I on business.%I for delete to authenticated using (public.is_global_admin(auth.uid()) or public.is_entity_admin(auth.uid(), entity_id))',
      table_name || '_delete_entity_admin',
      table_name
    );
  end loop;

  execute 'drop policy if exists business_close_template_tasks_select_entity_read on business.business_close_template_tasks';
  execute '
    create policy business_close_template_tasks_select_entity_read
    on business.business_close_template_tasks
    for select
    to authenticated
    using (
      public.is_global_admin(auth.uid())
      or exists (
        select 1
        from business.business_close_templates t
        where t.id = template_id
          and public.can_read_entity(t.entity_id, auth.uid())
      )
    )
  ';

  execute 'drop policy if exists business_close_template_tasks_insert_entity_admin on business.business_close_template_tasks';
  execute '
    create policy business_close_template_tasks_insert_entity_admin
    on business.business_close_template_tasks
    for insert
    to authenticated
    with check (
      public.is_global_admin(auth.uid())
      or exists (
        select 1
        from business.business_close_templates t
        where t.id = template_id
          and public.is_entity_admin(auth.uid(), t.entity_id)
      )
    )
  ';

  execute 'drop policy if exists business_close_template_tasks_update_entity_admin on business.business_close_template_tasks';
  execute '
    create policy business_close_template_tasks_update_entity_admin
    on business.business_close_template_tasks
    for update
    to authenticated
    using (
      public.is_global_admin(auth.uid())
      or exists (
        select 1
        from business.business_close_templates t
        where t.id = template_id
          and public.is_entity_admin(auth.uid(), t.entity_id)
      )
    )
    with check (
      public.is_global_admin(auth.uid())
      or exists (
        select 1
        from business.business_close_templates t
        where t.id = template_id
          and public.is_entity_admin(auth.uid(), t.entity_id)
      )
    )
  ';

  execute 'drop policy if exists business_close_template_tasks_delete_entity_admin on business.business_close_template_tasks';
  execute '
    create policy business_close_template_tasks_delete_entity_admin
    on business.business_close_template_tasks
    for delete
    to authenticated
    using (
      public.is_global_admin(auth.uid())
      or exists (
        select 1
        from business.business_close_templates t
        where t.id = template_id
          and public.is_entity_admin(auth.uid(), t.entity_id)
      )
    )
  ';
end;
$$;

commit;
