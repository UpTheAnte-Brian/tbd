insert into public.superintendent_scope_nonprofits (
  district_entity_id,
  ein,
  label,
  tier,
  status
)
values
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '320573784', 'Friends of Mound Westonka High School', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '371846058', 'Mound Westonka Baseball Dugout Club', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '202600024', 'Mound Westonka Basketball Boosters', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '205270303', 'Mound Westonka Fastpitch Boosters', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '920664172', 'Mound Westonka High School Girls Golf Boosters', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '411619499', 'Mound Westonka Hockey Association Inc.', 'disclosure_grade', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '271819245', 'Mound Westonka Lacrosse Association', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '833777068', 'Mound Westonka Nordic Boosters Club', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '203959205', 'Mound-Westonka High School Girls Hockey Association', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '411419110', 'Mound-Westonka Pop-Singers Scholarship Fund', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '411792779', 'Mound-Westonka Rotary Foundation', 'disclosure_grade', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '411800102', 'Orono Westonka Soccer Club Inc.', 'disclosure_grade', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '410882703', 'Westonka Community Alliance', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '993212332', 'Westonka Community Food Shelf', 'disclosure_grade', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '411839631', 'Westonka District 277 Foundation Corp Charter No 1n 862', 'disclosure_grade', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '800061816', 'Westonka Early Childhood Advisory Council', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '416037822', 'Westonka Education Minnesota', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '411427027', 'Westonka Estates', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '464145185', 'Westonka Flyers Swim Club', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '020746574', 'Westonka Football Boosters', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '331933737', 'Westonka High School Boys Volleyball Booster Club', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '030389616', 'Westonka Historical Society', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '510657140', 'Westonka Horticultural Society', 'disclosure_grade', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '411515776', 'Westonka Intervention Project Inc.', 'registry_only', 'candidate'),
  ('7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e', '465524647', 'Westonka Lacrosse Association', 'registry_only', 'candidate')
on conflict (district_entity_id, ein) do nothing;

insert into public.profiles (
  id,
  updated_at,
  full_name,
  first_name,
  last_name,
  avatar_url,
  role
)
select
  u.id,
  now(),
  coalesce(
    u.raw_user_meta_data->>'full_name',
    nullif(trim(concat(
      u.raw_user_meta_data->>'first_name',
      ' ',
      u.raw_user_meta_data->>'last_name'
    )), '')
  ) as full_name,
  u.raw_user_meta_data->>'first_name' as first_name,
  u.raw_user_meta_data->>'last_name' as last_name,
  u.raw_user_meta_data->>'avatar_url' as avatar_url,
  coalesce(u.raw_user_meta_data->>'role', 'user') as role
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;