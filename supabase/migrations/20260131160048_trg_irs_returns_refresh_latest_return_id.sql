

-- Ensure trigger exists to keep irs.organizations.latest_return_id current.
-- Order-safe: only creates trigger if irs.returns exists.

begin;

-- Helper: refresh latest_return_id for a single EIN
create or replace function irs.refresh_latest_return_id(p_ein text)
returns void
language plpgsql
as $$
declare
  v_best_return_id uuid;
begin
  if p_ein is null or p_ein = '' then
    return;
  end if;

  select r.id
    into v_best_return_id
  from irs.returns r
  where r.ein = p_ein
  order by
    r.tax_period_end desc nulls last,
    r.filed_on desc nulls last,
    r.updated_at desc nulls last,
    r.id desc
  limit 1;

  update irs.organizations o
  set latest_return_id = v_best_return_id
  where o.ein = p_ein;
end;
$$;

-- Trigger function
create or replace function irs.tg_refresh_latest_return_id()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    perform irs.refresh_latest_return_id(new.ein);
    return new;
  elsif (tg_op = 'UPDATE') then
    perform irs.refresh_latest_return_id(old.ein);
    perform irs.refresh_latest_return_id(new.ein);
    return new;
  elsif (tg_op = 'DELETE') then
    perform irs.refresh_latest_return_id(old.ein);
    return old;
  end if;
  return null;
end;
$$;

-- Ensure supporting index exists (safe even if already created)
DO $$
BEGIN
  IF to_regclass('irs.returns') IS NOT NULL THEN
    EXECUTE 'create index if not exists returns_ein_tax_period_end_idx on irs.returns (ein, tax_period_end desc)';
  END IF;
END $$;

-- Drop/recreate trigger only if irs.returns exists
DO $$
BEGIN
  IF to_regclass('irs.returns') IS NOT NULL THEN
    EXECUTE 'drop trigger if exists trg_irs_returns_refresh_latest_return_id on irs.returns';
    EXECUTE 'create trigger trg_irs_returns_refresh_latest_return_id
             after insert or update of ein, tax_period_end, filed_on or delete
             on irs.returns
             for each row
             execute function irs.tg_refresh_latest_return_id()';
  END IF;
END $$;

commit;
