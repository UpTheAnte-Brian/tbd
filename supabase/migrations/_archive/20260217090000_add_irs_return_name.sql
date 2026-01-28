alter table if exists irs.returns
  add column if not exists return_name text;

with candidate as (
  select distinct on (n.return_id)
    n.return_id,
    nullif(
      trim(
        regexp_replace(
          substring(
            regexp_replace(n.raw_text, '\r', '', 'g')
            from '(?is)Name\s*:\s*(.+?)(?:\n\s*Form\s+990|\n\s*EIN|\n\s*$)'
          ),
          '\s{2,}',
          ' ',
          'g'
        )
      ),
      ''
    ) as return_name
  from irs.return_narratives n
  where n.section = 'part_iii'
  order by n.return_id, n.created_at desc
)
update irs.returns r
set return_name = c.return_name
from candidate c
where r.id = c.return_id
  and c.return_name is not null
  and (r.return_name is null or r.return_name = '');

create index if not exists returns_return_name_trgm
  on irs.returns using gin (return_name gin_trgm_ops);
