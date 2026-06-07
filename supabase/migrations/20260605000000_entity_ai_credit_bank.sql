begin;

create table if not exists public.ai_credit_rates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  usd_cents_per_credit integer not null check (usd_cents_per_credit > 0),
  effective_at timestamptz not null default now(),
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ai_credit_rates_retired_after_effective_chk
    check (retired_at is null or retired_at > effective_at)
);

create unique index if not exists ai_credit_rates_one_active_idx
  on public.ai_credit_rates ((true))
  where retired_at is null;

insert into public.ai_credit_rates (name, usd_cents_per_credit)
select 'default', 1
where not exists (
  select 1
  from public.ai_credit_rates
  where retired_at is null
);

create table if not exists public.entity_ai_accounts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'paused', 'closed')),
  display_name text,
  monthly_budget_credits integer not null default 0
    check (monthly_budget_credits >= 0),
  hard_limit_credits integer not null default 0
    check (hard_limit_credits >= 0),
  low_balance_threshold_credits integer not null default 1000
    check (low_balance_threshold_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id)
);

create table if not exists public.entity_ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  account_id uuid not null references public.entity_ai_accounts(id) on delete cascade,
  direction text not null
    check (direction in ('credit', 'debit', 'adjustment', 'refund')),
  amount_credits integer not null check (amount_credits > 0),
  money_amount_cents integer check (money_amount_cents is null or money_amount_cents >= 0),
  source_type text not null
    check (source_type in ('donation', 'subscription', 'usage', 'admin_adjustment', 'promo', 'refund')),
  source_id text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists entity_ai_credit_ledger_entity_created_idx
  on public.entity_ai_credit_ledger (entity_id, created_at desc);

create unique index if not exists entity_ai_credit_ledger_source_uidx
  on public.entity_ai_credit_ledger (entity_id, source_type, source_id, direction)
  where source_id is not null;

create table if not exists public.entity_ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  agent_run_id uuid,
  capability text not null,
  provider text,
  model text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cached_tokens integer not null default 0 check (cached_tokens >= 0),
  provider_cost_cents integer not null default 0 check (provider_cost_cents >= 0),
  billed_credits integer not null default 0 check (billed_credits >= 0),
  status text not null default 'succeeded'
    check (status in ('estimated', 'succeeded', 'failed', 'refunded')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists entity_ai_usage_events_entity_created_idx
  on public.entity_ai_usage_events (entity_id, created_at desc);

create table if not exists public.entity_agents (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused')),
  instructions text,
  enabled_capabilities jsonb not null default '{}'::jsonb,
  safety_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id)
);

create table if not exists public.entity_agent_runs (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  agent_id uuid references public.entity_agents(id) on delete set null,
  requested_by uuid references public.profiles(id) on delete set null,
  capability text not null,
  prompt_summary text,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  credit_estimate integer not null default 0 check (credit_estimate >= 0),
  credits_charged integer not null default 0 check (credits_charged >= 0),
  result_summary text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists entity_agent_runs_entity_created_idx
  on public.entity_agent_runs (entity_id, created_at desc);

alter table public.entity_ai_usage_events
  add column if not exists agent_run_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'entity_ai_usage_events_agent_run_id_fkey'
      and conrelid = 'public.entity_ai_usage_events'::regclass
  ) then
    alter table public.entity_ai_usage_events
      add constraint entity_ai_usage_events_agent_run_id_fkey
      foreign key (agent_run_id)
      references public.entity_agent_runs(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists entity_ai_usage_events_agent_run_idx
  on public.entity_ai_usage_events (agent_run_id)
  where agent_run_id is not null;

create or replace function public.ensure_entity_ai_account(p_entity_id uuid)
returns public.entity_ai_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.entity_ai_accounts;
begin
  if auth.uid() is not null
     and not public.can_read_entity(p_entity_id, auth.uid()) then
    raise exception 'forbidden';
  end if;

  insert into public.entity_ai_accounts (entity_id)
  values (p_entity_id)
  on conflict (entity_id) do nothing;

  select *
  into v_account
  from public.entity_ai_accounts
  where entity_id = p_entity_id;

  return v_account;
end;
$$;

create or replace function public.current_ai_credit_rate()
returns public.ai_credit_rates
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.ai_credit_rates
  where retired_at is null
  order by effective_at desc
  limit 1;
$$;

create or replace function public.entity_ai_credit_balance(p_entity_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null
      or public.can_read_entity(p_entity_id, auth.uid())
    then (
      select coalesce(sum(
        case
          when direction in ('credit', 'refund') then amount_credits
          when direction in ('debit') then -amount_credits
          when direction = 'adjustment' then amount_credits
          else 0
        end
      ), 0)::integer
      from public.entity_ai_credit_ledger
      where entity_id = p_entity_id
    )
    else 0
  end;
$$;

create or replace function public.grant_entity_ai_donation_credits(
  p_entity_id uuid,
  p_donation_id uuid,
  p_amount_cents integer,
  p_created_by uuid default null
)
returns public.entity_ai_credit_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.entity_ai_accounts;
  v_rate public.ai_credit_rates;
  v_credits integer;
  v_entry public.entity_ai_credit_ledger;
begin
  if p_entity_id is null then
    raise exception 'entity id is required';
  end if;

  if p_donation_id is null then
    raise exception 'donation id is required';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'amount must be positive';
  end if;

  v_account := public.ensure_entity_ai_account(p_entity_id);
  v_rate := public.current_ai_credit_rate();

  if v_rate.id is null then
    raise exception 'no active ai credit rate';
  end if;

  v_credits := floor(p_amount_cents::numeric / v_rate.usd_cents_per_credit)::integer;

  insert into public.entity_ai_credit_ledger (
    entity_id,
    account_id,
    direction,
    amount_credits,
    money_amount_cents,
    source_type,
    source_id,
    description,
    metadata,
    created_by
  )
  values (
    p_entity_id,
    v_account.id,
    'credit',
    v_credits,
    p_amount_cents,
    'donation',
    p_donation_id::text,
    'AI credit donation',
    jsonb_build_object(
      'rate_id', v_rate.id,
      'usd_cents_per_credit', v_rate.usd_cents_per_credit
    ),
    p_created_by
  )
  on conflict (entity_id, source_type, source_id, direction)
  where source_id is not null
  do update set
    amount_credits = excluded.amount_credits,
    money_amount_cents = excluded.money_amount_cents,
    metadata = excluded.metadata
  returning *
  into v_entry;

  return v_entry;
end;
$$;

create or replace function public.record_entity_ai_usage(
  p_entity_id uuid,
  p_capability text,
  p_billed_credits integer,
  p_provider text default null,
  p_model text default null,
  p_input_tokens integer default 0,
  p_output_tokens integer default 0,
  p_cached_tokens integer default 0,
  p_provider_cost_cents integer default 0,
  p_status text default 'succeeded',
  p_agent_run_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_created_by uuid default null
)
returns public.entity_ai_usage_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.entity_ai_accounts;
  v_usage public.entity_ai_usage_events;
  v_balance integer;
  v_debit_required boolean;
begin
  if p_entity_id is null then
    raise exception 'entity id is required';
  end if;

  if nullif(trim(p_capability), '') is null then
    raise exception 'capability is required';
  end if;

  if p_billed_credits is null or p_billed_credits < 0 then
    raise exception 'billed credits cannot be negative';
  end if;

  if p_input_tokens < 0
     or p_output_tokens < 0
     or p_cached_tokens < 0
     or p_provider_cost_cents < 0 then
    raise exception 'usage values cannot be negative';
  end if;

  if p_status not in ('estimated', 'succeeded', 'failed', 'refunded') then
    raise exception 'invalid usage status: %', p_status;
  end if;

  if auth.uid() is not null
     and not public.can_read_entity(p_entity_id, auth.uid()) then
    raise exception 'forbidden';
  end if;

  v_account := public.ensure_entity_ai_account(p_entity_id);

  if v_account.status <> 'active' then
    raise exception 'ai account is %', v_account.status;
  end if;

  v_debit_required := p_status = 'succeeded' and p_billed_credits > 0;

  if v_debit_required then
    v_balance := public.entity_ai_credit_balance(p_entity_id);
    if v_balance < p_billed_credits then
      raise exception 'insufficient ai credits: balance %, required %',
        v_balance,
        p_billed_credits;
    end if;
  end if;

  insert into public.entity_ai_usage_events (
    entity_id,
    agent_run_id,
    capability,
    provider,
    model,
    input_tokens,
    output_tokens,
    cached_tokens,
    provider_cost_cents,
    billed_credits,
    status,
    metadata,
    created_by
  )
  values (
    p_entity_id,
    p_agent_run_id,
    p_capability,
    p_provider,
    p_model,
    p_input_tokens,
    p_output_tokens,
    p_cached_tokens,
    p_provider_cost_cents,
    p_billed_credits,
    p_status,
    coalesce(p_metadata, '{}'::jsonb),
    p_created_by
  )
  returning *
  into v_usage;

  if v_debit_required then
    insert into public.entity_ai_credit_ledger (
      entity_id,
      account_id,
      direction,
      amount_credits,
      money_amount_cents,
      source_type,
      source_id,
      description,
      metadata,
      created_by
    )
    values (
      p_entity_id,
      v_account.id,
      'debit',
      p_billed_credits,
      p_provider_cost_cents,
      'usage',
      v_usage.id::text,
      'AI agent usage',
      jsonb_build_object(
        'capability', p_capability,
        'provider', p_provider,
        'model', p_model,
        'input_tokens', p_input_tokens,
        'output_tokens', p_output_tokens,
        'cached_tokens', p_cached_tokens,
        'agent_run_id', p_agent_run_id
      ) || coalesce(p_metadata, '{}'::jsonb),
      p_created_by
    );

    if p_agent_run_id is not null then
      update public.entity_agent_runs
      set credits_charged = credits_charged + p_billed_credits
      where id = p_agent_run_id
        and entity_id = p_entity_id;
    end if;
  end if;

  return v_usage;
end;
$$;

create or replace view public.entity_ai_account_summaries
with (security_invoker = true) as
with usage_summary as (
  select
    entity_id,
    coalesce(sum(billed_credits) filter (
      where created_at >= date_trunc('month', now())
    ), 0)::integer as month_usage_credits,
    max(created_at) as last_used_at
  from public.entity_ai_usage_events
  group by entity_id
),
funding_summary as (
  select
    entity_id,
    max(created_at) filter (
      where direction in ('credit', 'refund')
    ) as last_funded_at
  from public.entity_ai_credit_ledger
  group by entity_id
)
select
  a.id as account_id,
  a.entity_id,
  a.status,
  a.display_name,
  a.monthly_budget_credits,
  a.hard_limit_credits,
  a.low_balance_threshold_credits,
  public.entity_ai_credit_balance(a.entity_id) as balance_credits,
  coalesce(u.month_usage_credits, 0)::integer as month_usage_credits,
  f.last_funded_at,
  u.last_used_at,
  a.created_at,
  a.updated_at
from public.entity_ai_accounts a
left join usage_summary u on u.entity_id = a.entity_id
left join funding_summary f on f.entity_id = a.entity_id;

alter table public.ai_credit_rates enable row level security;
alter table public.entity_ai_accounts enable row level security;
alter table public.entity_ai_credit_ledger enable row level security;
alter table public.entity_ai_usage_events enable row level security;
alter table public.entity_agents enable row level security;
alter table public.entity_agent_runs enable row level security;

drop policy if exists ai_credit_rates_read on public.ai_credit_rates;
create policy ai_credit_rates_read
on public.ai_credit_rates
for select
to anon, authenticated
using (true);

drop policy if exists ai_credit_rates_admin_write on public.ai_credit_rates;
create policy ai_credit_rates_admin_write
on public.ai_credit_rates
for all
to authenticated
using (public.is_global_admin(auth.uid()))
with check (public.is_global_admin(auth.uid()));

drop policy if exists entity_ai_accounts_read on public.entity_ai_accounts;
create policy entity_ai_accounts_read
on public.entity_ai_accounts
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.can_read_entity(entity_id, auth.uid())
);

drop policy if exists entity_ai_accounts_admin_write on public.entity_ai_accounts;
create policy entity_ai_accounts_admin_write
on public.entity_ai_accounts
for all
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
)
with check (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

drop policy if exists entity_ai_credit_ledger_read on public.entity_ai_credit_ledger;
create policy entity_ai_credit_ledger_read
on public.entity_ai_credit_ledger
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.can_read_entity(entity_id, auth.uid())
);

drop policy if exists entity_ai_credit_ledger_admin_insert on public.entity_ai_credit_ledger;
create policy entity_ai_credit_ledger_admin_insert
on public.entity_ai_credit_ledger
for insert
to authenticated
with check (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

drop policy if exists entity_ai_usage_events_read on public.entity_ai_usage_events;
create policy entity_ai_usage_events_read
on public.entity_ai_usage_events
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.can_read_entity(entity_id, auth.uid())
);

drop policy if exists entity_agents_read on public.entity_agents;
create policy entity_agents_read
on public.entity_agents
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.can_read_entity(entity_id, auth.uid())
);

drop policy if exists entity_agents_admin_write on public.entity_agents;
create policy entity_agents_admin_write
on public.entity_agents
for all
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
)
with check (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(auth.uid(), entity_id)
);

drop policy if exists entity_agent_runs_read on public.entity_agent_runs;
create policy entity_agent_runs_read
on public.entity_agent_runs
for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or public.can_read_entity(entity_id, auth.uid())
);

drop policy if exists entity_agent_runs_insert on public.entity_agent_runs;
create policy entity_agent_runs_insert
on public.entity_agent_runs
for insert
to authenticated
with check (
  public.is_global_admin(auth.uid())
  or public.can_read_entity(entity_id, auth.uid())
);

grant select on public.ai_credit_rates to anon, authenticated;
grant select on public.entity_ai_account_summaries to authenticated;
grant select, insert, update on public.entity_ai_accounts to authenticated;
grant select, insert on public.entity_ai_credit_ledger to authenticated;
grant select on public.entity_ai_usage_events to authenticated;
grant select, insert, update on public.entity_agents to authenticated;
grant select, insert on public.entity_agent_runs to authenticated;

grant execute on function public.ensure_entity_ai_account(uuid) to authenticated, service_role;
grant execute on function public.current_ai_credit_rate() to anon, authenticated, service_role;
grant execute on function public.entity_ai_credit_balance(uuid) to authenticated, service_role;
grant execute on function public.grant_entity_ai_donation_credits(uuid, uuid, integer, uuid) to service_role;
grant execute on function public.record_entity_ai_usage(
  uuid,
  text,
  integer,
  text,
  text,
  integer,
  integer,
  integer,
  integer,
  text,
  uuid,
  jsonb,
  uuid
) to authenticated, service_role;

commit;
