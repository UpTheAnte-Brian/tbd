-- 20260201_add_authoritative_xml_guard.sql

-- Enforce one authoritative (XML) return per EIN + tax period
create unique index if not exists returns_unique_authoritative_xml
on irs.returns (ein, tax_period_start, tax_period_end)
where source_priority = 'xml';
