-- Clear legacy district logo paths so branding can start fresh
update public.district_metadata
set logo_path = null;
