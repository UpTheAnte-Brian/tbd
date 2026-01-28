-- Add tax year metadata to documents
alter table public.documents
  add column if not exists tax_year int null;

create index if not exists documents_tax_year_idx
  on public.documents(tax_year);
