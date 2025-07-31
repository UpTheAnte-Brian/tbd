revoke delete on table "public"."user_roles" from "anon";

revoke insert on table "public"."user_roles" from "anon";

revoke references on table "public"."user_roles" from "anon";

revoke select on table "public"."user_roles" from "anon";

revoke trigger on table "public"."user_roles" from "anon";

revoke truncate on table "public"."user_roles" from "anon";

revoke update on table "public"."user_roles" from "anon";

revoke delete on table "public"."user_roles" from "authenticated";

revoke insert on table "public"."user_roles" from "authenticated";

revoke references on table "public"."user_roles" from "authenticated";

revoke select on table "public"."user_roles" from "authenticated";

revoke trigger on table "public"."user_roles" from "authenticated";

revoke truncate on table "public"."user_roles" from "authenticated";

revoke update on table "public"."user_roles" from "authenticated";

create table "public"."foundations" (
    "id" uuid not null default gen_random_uuid(),
    "district_id" text not null,
    "name" text,
    "contact" text,
    "website" text,
    "founding_year" integer,
    "average_class_size" double precision,
    "balance_sheet" double precision,
    "inserted_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
);


CREATE UNIQUE INDEX foundations_district_id_key ON public.foundations USING btree (district_id);

CREATE UNIQUE INDEX foundations_pkey ON public.foundations USING btree (id);

alter table "public"."foundations" add constraint "foundations_pkey" PRIMARY KEY using index "foundations_pkey";

alter table "public"."foundations" add constraint "foundations_district_id_fkey" FOREIGN KEY (district_id) REFERENCES districts(sdorgid) ON DELETE CASCADE not valid;

alter table "public"."foundations" validate constraint "foundations_district_id_fkey";

alter table "public"."foundations" add constraint "foundations_district_id_key" UNIQUE using index "foundations_district_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

grant delete on table "public"."foundations" to "anon";

grant insert on table "public"."foundations" to "anon";

grant references on table "public"."foundations" to "anon";

grant select on table "public"."foundations" to "anon";

grant trigger on table "public"."foundations" to "anon";

grant truncate on table "public"."foundations" to "anon";

grant update on table "public"."foundations" to "anon";

grant delete on table "public"."foundations" to "authenticated";

grant insert on table "public"."foundations" to "authenticated";

grant references on table "public"."foundations" to "authenticated";

grant select on table "public"."foundations" to "authenticated";

grant trigger on table "public"."foundations" to "authenticated";

grant truncate on table "public"."foundations" to "authenticated";

grant update on table "public"."foundations" to "authenticated";

grant delete on table "public"."foundations" to "service_role";

grant insert on table "public"."foundations" to "service_role";

grant references on table "public"."foundations" to "service_role";

grant select on table "public"."foundations" to "service_role";

grant trigger on table "public"."foundations" to "service_role";

grant truncate on table "public"."foundations" to "service_role";

grant update on table "public"."foundations" to "service_role";

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.foundations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


