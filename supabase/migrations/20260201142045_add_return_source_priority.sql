-- Source priority determines authoritative data
-- xml = TEOS XML (highest trust)
-- pdf = OCR fallback

alter table irs.returns
add column if not exists source_priority text not null default 'xml'
check (source_priority in ('xml', 'pdf'));

alter table irs.returns
add column if not exists source_system text;

comment on column irs.returns.source_priority is
'Authoritative source of this return. XML wins over PDF.';