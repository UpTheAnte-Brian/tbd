-- Add TEOS + XML metadata columns to irs.returns
-- (safe/idempotent)

-- Ensure irs_object_id is unique for TEOS upserts
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'irs'
      and t.relname = 'returns'
      and c.contype = 'u'
      and c.conname = 'returns_irs_object_id_uidx'
  ) then
    alter table irs.returns
      add constraint returns_irs_object_id_uidx unique (irs_object_id);
  end if;
end $$;

alter table irs.returns
  add column if not exists xml_sha256 text,
  add column if not exists xml_path text,

  -- TEOS index metadata
  add column if not exists teos_index_year int,
  add column if not exists teos_tax_period_yyyymm text,
  add column if not exists teos_return_id text,
  add column if not exists teos_filing_type text,
  add column if not exists teos_tax_year text,
  add column if not exists teos_taxpayer_name text,
  add column if not exists teos_return_type text,
  add column if not exists teos_shard text;

-- Useful indexes
create index if not exists returns_ein_idx
  on irs.returns (ein);

create index if not exists returns_tax_period_end_idx
  on irs.returns (tax_period_end);

create index if not exists returns_irs_object_id_idx
  on irs.returns (irs_object_id);

create index if not exists returns_teos_index_year_idx
  on irs.returns (teos_index_year);

-- Optional: faster "latest return per EIN" queries
create index if not exists returns_ein_tax_period_end_idx
  on irs.returns (ein, tax_period_end desc);