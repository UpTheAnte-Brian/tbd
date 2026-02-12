-- 1) Public tables with RLS disabled
select
  n.nspname as schema_name,
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false
order by c.relname;

-- 2) RLS-enabled tables with zero policies
select
  n.nspname as schema_name,
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname
  and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = true
group by n.nspname, c.relname
having count(p.policyname) = 0
order by c.relname;

-- 3) anon SELECT grants on donations/subscriptions (should be none)
select
  grantee,
  table_schema,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('donations', 'subscriptions')
  and privilege_type = 'SELECT'
  and grantee = 'anon'
order by table_name;
