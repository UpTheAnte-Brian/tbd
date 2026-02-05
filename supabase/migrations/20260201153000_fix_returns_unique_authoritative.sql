-- Fix authoritative XML uniqueness without editing applied migrations.

-- Drop any prior authoritative indexes (names may vary across iterations)
drop index if exists returns_unique_authoritative;
drop index if exists returns_unique_authoritative_xml;
drop index if exists returns_unique_authoritative_xml_period;
drop index if exists returns_unique_authoritative_xml_year;

-- Authoritative XML: prefer TEOS tax period when present; fall back to tax_year otherwise.
create unique index if not exists returns_unique_authoritative_xml_period
on irs.returns (ein, teos_tax_period_yyyymm)
where source_priority = 'xml' and teos_tax_period_yyyymm is not null;

create unique index if not exists returns_unique_authoritative_xml_year
on irs.returns (ein, tax_year)
where source_priority = 'xml' and teos_tax_period_yyyymm is null;
