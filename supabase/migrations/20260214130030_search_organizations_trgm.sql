create or replace function irs.search_organizations_trgm(
  p_query text,
  p_state text default null,
  p_city_prefix text default null,
  p_only_pub78 boolean default false,
  p_only_revoked boolean default false,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  ein text,
  legal_name text,
  city text,
  state text,
  country text,
  is_pub78 boolean,
  is_revoked boolean,
  score real
)
language sql
stable
as $$
  select
    o.ein,
    o.legal_name,
    o.city,
    o.state,
    o.country,
    o.is_pub78,
    o.is_revoked,
    greatest(
      similarity(o.normalized_legal_name, upper(p_query)),
      similarity(o.legal_name, p_query)
    )::real as score
  from irs.organizations o
  where
    (
      o.normalized_legal_name % upper(p_query)
      or o.legal_name % p_query
      or o.legal_name ilike '%' || p_query || '%'
    )
    and (p_state is null or o.state = p_state)
    and (p_city_prefix is null or o.city ilike p_city_prefix || '%')
    and (not p_only_pub78 or o.is_pub78 = true)
    and (not p_only_revoked or o.is_revoked = true)
  order by score desc, o.legal_name
  limit greatest(1, least(p_limit, 200))
  offset greatest(p_offset, 0);
$$;