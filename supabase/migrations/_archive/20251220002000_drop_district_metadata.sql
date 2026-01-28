-- Drop legacy district_metadata table now that branding handles logos
drop table if exists public.district_metadata cascade;
