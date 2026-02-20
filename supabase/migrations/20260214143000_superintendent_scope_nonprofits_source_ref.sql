-- Store ingest provenance on superintendent scope nonprofit rows.
-- This supports EO BMF name-match imports writing source system + source ref details.

alter table public.superintendent_scope_nonprofits
  add column if not exists source_system text null,
  add column if not exists source_ref text null;

create index if not exists superintendent_scope_nonprofits_source_system_idx
  on public.superintendent_scope_nonprofits (source_system);
