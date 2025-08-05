drop policy "Admins can manage metadata" on "public"."district_metadata";

alter table "public"."profiles" add column "first_name" text;

alter table "public"."profiles" add column "last_name" text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, first_name, last_name)
  values (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name');
  return new;
end;
$function$
;

create policy "Admin access only"
on "public"."district_metadata"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));


create policy "All users can read"
on "public"."district_metadata"
as permissive
for select
to public
using (true);


create policy "Allow read access"
on "public"."user_roles"
as permissive
for select
to public
using (true);



