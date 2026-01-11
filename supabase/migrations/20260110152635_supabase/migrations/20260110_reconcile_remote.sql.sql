revoke delete on table "public"."entity_types" from "anon";

revoke insert on table "public"."entity_types" from "anon";

revoke references on table "public"."entity_types" from "anon";

revoke select on table "public"."entity_types" from "anon";

revoke trigger on table "public"."entity_types" from "anon";

revoke truncate on table "public"."entity_types" from "anon";

revoke update on table "public"."entity_types" from "anon";

revoke delete on table "public"."entity_types" from "authenticated";

revoke insert on table "public"."entity_types" from "authenticated";

revoke references on table "public"."entity_types" from "authenticated";

revoke select on table "public"."entity_types" from "authenticated";

revoke trigger on table "public"."entity_types" from "authenticated";

revoke truncate on table "public"."entity_types" from "authenticated";

revoke update on table "public"."entity_types" from "authenticated";

revoke delete on table "public"."entity_types" from "service_role";

revoke insert on table "public"."entity_types" from "service_role";

revoke references on table "public"."entity_types" from "service_role";

revoke select on table "public"."entity_types" from "service_role";

revoke trigger on table "public"."entity_types" from "service_role";

revoke truncate on table "public"."entity_types" from "service_role";

revoke update on table "public"."entity_types" from "service_role";

revoke delete on table "public"."spatial_ref_sys" from "anon";

revoke insert on table "public"."spatial_ref_sys" from "anon";

revoke references on table "public"."spatial_ref_sys" from "anon";

revoke select on table "public"."spatial_ref_sys" from "anon";

revoke trigger on table "public"."spatial_ref_sys" from "anon";

revoke truncate on table "public"."spatial_ref_sys" from "anon";

revoke update on table "public"."spatial_ref_sys" from "anon";

revoke delete on table "public"."spatial_ref_sys" from "authenticated";

revoke insert on table "public"."spatial_ref_sys" from "authenticated";

revoke references on table "public"."spatial_ref_sys" from "authenticated";

revoke select on table "public"."spatial_ref_sys" from "authenticated";

revoke trigger on table "public"."spatial_ref_sys" from "authenticated";

revoke truncate on table "public"."spatial_ref_sys" from "authenticated";

revoke update on table "public"."spatial_ref_sys" from "authenticated";

revoke delete on table "public"."spatial_ref_sys" from "postgres";

revoke insert on table "public"."spatial_ref_sys" from "postgres";

revoke references on table "public"."spatial_ref_sys" from "postgres";

revoke select on table "public"."spatial_ref_sys" from "postgres";

revoke trigger on table "public"."spatial_ref_sys" from "postgres";

revoke truncate on table "public"."spatial_ref_sys" from "postgres";

revoke update on table "public"."spatial_ref_sys" from "postgres";

revoke delete on table "public"."spatial_ref_sys" from "service_role";

revoke insert on table "public"."spatial_ref_sys" from "service_role";

revoke references on table "public"."spatial_ref_sys" from "service_role";

revoke select on table "public"."spatial_ref_sys" from "service_role";

revoke trigger on table "public"."spatial_ref_sys" from "service_role";

revoke truncate on table "public"."spatial_ref_sys" from "service_role";

revoke update on table "public"."spatial_ref_sys" from "service_role";

alter table "public"."donations" drop constraint "donations_user_id_fkey";

alter table "public"."subscriptions" drop constraint "subscriptions_district_id_fkey";

alter table "public"."subscriptions" drop constraint "subscriptions_stripe_subscription_id_key";

alter table "public"."subscriptions" drop constraint "subscriptions_user_id_fkey";

alter table "public"."donations" drop constraint "donations_district_id_fkey";

drop type "public"."geometry_dump";

drop type "public"."valid_detail";

alter table "public"."entity_types" drop constraint "entity_types_pkey";

drop index if exists "public"."donations_invoice_id_idx";

drop index if exists "public"."donations_payment_intent_id_idx";

drop index if exists "public"."entity_types_pkey";

drop index if exists "public"."idx_districts_geometry_geom_gist";

drop index if exists "public"."idx_districts_geometry_simplified_gist";

drop index if exists "public"."idx_districts_sdorgid";

drop index if exists "public"."subscriptions_stripe_subscription_id_key";

drop table "public"."entity_types";


  create table "public"."district_metadata" (
    "sdorgid" text not null,
    "logo_path" text,
    "extra_info" jsonb
      );


alter table "public"."districts" drop column "geometry_geom";

alter table "public"."districts" drop column "geometry_simplified";

alter table "public"."districts" drop column "geometry_simplified_geojson";

alter table "public"."donations" drop column "email";

alter table "public"."donations" drop column "invoice_id";

alter table "public"."donations" drop column "receipt_url";

alter table "public"."donations" drop column "user_id";

alter table "public"."donations" add column "currency" text default 'usd'::text;

alter table "public"."donations" add column "donor_email" text;

alter table "public"."donations" alter column "stripe_session_id" drop not null;

alter table "public"."donations" alter column "type" drop default;

alter table "public"."donations" alter column "type" drop not null;

alter table "public"."donations" alter column "type" set data type text using "type"::text;

alter table "public"."subscriptions" drop column "district_id";

alter table "public"."subscriptions" drop column "email";

alter table "public"."subscriptions" drop column "stripe_subscription_id";

alter table "public"."subscriptions" drop column "updated_at";

alter table "public"."subscriptions" drop column "user_id";

alter table "public"."subscriptions" add column "amount" integer not null;

alter table "public"."subscriptions" add column "canceled_at" timestamp with time zone;

alter table "public"."subscriptions" add column "currency" text default 'usd'::text;

alter table "public"."subscriptions" add column "donor_email" text;

alter table "public"."subscriptions" add column "subscription_id" text not null;

alter table "public"."subscriptions" alter column "status" set default 'active'::text;

alter table "public"."subscriptions" alter column "status" drop not null;

drop type "public"."donation_type";

drop extension if exists "postgis";

CREATE UNIQUE INDEX district_metadata_pkey ON public.district_metadata USING btree (sdorgid);

CREATE UNIQUE INDEX subscriptions_subscription_id_key ON public.subscriptions USING btree (subscription_id);

alter table "public"."district_metadata" add constraint "district_metadata_pkey" PRIMARY KEY using index "district_metadata_pkey";

alter table "public"."district_metadata" add constraint "district_metadata_sdorgid_fkey" FOREIGN KEY (sdorgid) REFERENCES public.districts(sdorgid) not valid;

alter table "public"."district_metadata" validate constraint "district_metadata_sdorgid_fkey";

alter table "public"."donations" add constraint "donations_type_check" CHECK ((type = ANY (ARRAY['one-time'::text, 'recurring-renewal'::text]))) not valid;

alter table "public"."donations" validate constraint "donations_type_check";

alter table "public"."subscriptions" add constraint "subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'canceled'::text, 'past_due'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_status_check";

alter table "public"."subscriptions" add constraint "subscriptions_subscription_id_key" UNIQUE using index "subscriptions_subscription_id_key";

alter table "public"."donations" add constraint "donations_district_id_fkey" FOREIGN KEY (district_id) REFERENCES public.districts(id) not valid;

alter table "public"."donations" validate constraint "donations_district_id_fkey";

grant delete on table "public"."district_metadata" to "anon";

grant insert on table "public"."district_metadata" to "anon";

grant references on table "public"."district_metadata" to "anon";

grant select on table "public"."district_metadata" to "anon";

grant trigger on table "public"."district_metadata" to "anon";

grant truncate on table "public"."district_metadata" to "anon";

grant update on table "public"."district_metadata" to "anon";

grant delete on table "public"."district_metadata" to "authenticated";

grant insert on table "public"."district_metadata" to "authenticated";

grant references on table "public"."district_metadata" to "authenticated";

grant select on table "public"."district_metadata" to "authenticated";

grant trigger on table "public"."district_metadata" to "authenticated";

grant truncate on table "public"."district_metadata" to "authenticated";

grant update on table "public"."district_metadata" to "authenticated";

grant delete on table "public"."district_metadata" to "service_role";

grant insert on table "public"."district_metadata" to "service_role";

grant references on table "public"."district_metadata" to "service_role";

grant select on table "public"."district_metadata" to "service_role";

grant trigger on table "public"."district_metadata" to "service_role";

grant truncate on table "public"."district_metadata" to "service_role";

grant update on table "public"."district_metadata" to "service_role";


  create policy "Authenticated users can select metadata"
  on "public"."district_metadata"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Everyone can see district metadata table"
  on "public"."district_metadata"
  as permissive
  for select
  to public
using (true);



