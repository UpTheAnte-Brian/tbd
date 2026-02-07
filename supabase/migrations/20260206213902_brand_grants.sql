-- allow roles to see the schema
grant usage on schema branding to anon, authenticated;

-- reads (your UI probably needs this widely)
grant select on all tables in schema branding to anon, authenticated;

-- writes (lock to authenticated; RLS still controls *which rows*)
grant insert, update, delete on all tables in schema branding to authenticated;

-- if you have functions used by the client
grant execute on all functions in schema branding to anon, authenticated;

-- make future tables/functions inherit the same grants
alter default privileges in schema branding
grant select on tables to anon, authenticated;

alter default privileges in schema branding
grant insert, update, delete on tables to authenticated;

alter default privileges in schema branding
grant execute on functions to anon, authenticated;