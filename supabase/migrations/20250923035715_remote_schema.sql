create extension if not exists "postgis" with schema "public";

create type "public"."donation_type" as enum ('platform', 'district');

alter table "public"."donations" drop constraint "donations_type_check";

alter table "public"."subscriptions" drop constraint "subscriptions_status_check";

alter table "public"."subscriptions" drop constraint "subscriptions_subscription_id_key";

alter table "public"."donations" drop constraint "donations_district_id_fkey";

drop index if exists "public"."subscriptions_subscription_id_key";

alter table "public"."districts" add column "geometry_geom" geometry;


alter table "public"."donations" drop column "currency";

alter table "public"."donations" drop column "donor_email";

alter table "public"."donations" add column "email" text;

alter table "public"."donations" add column "invoice_id" text;

alter table "public"."donations" add column "receipt_url" text;

alter table "public"."donations" add column "user_id" uuid;

alter table "public"."donations" alter column "stripe_session_id" set not null;

alter table "public"."donations" alter column "type" set default 'platform'::donation_type;

alter table "public"."donations" alter column "type" set not null;

alter table "public"."donations" alter column "type" set data type donation_type using "type"::donation_type;

alter table "public"."subscriptions" drop column "amount";

alter table "public"."subscriptions" drop column "canceled_at";

alter table "public"."subscriptions" drop column "currency";

alter table "public"."subscriptions" drop column "donor_email";

alter table "public"."subscriptions" drop column "subscription_id";

alter table "public"."subscriptions" add column "district_id" uuid;

alter table "public"."subscriptions" add column "email" text;

alter table "public"."subscriptions" add column "stripe_subscription_id" text not null;

alter table "public"."subscriptions" add column "updated_at" timestamp with time zone default now();

alter table "public"."subscriptions" add column "user_id" uuid;

alter table "public"."subscriptions" alter column "status" drop default;

alter table "public"."subscriptions" alter column "status" set not null;

CREATE INDEX donations_invoice_id_idx ON public.donations USING btree (invoice_id);

CREATE INDEX donations_payment_intent_id_idx ON public.donations USING btree (invoice_id);

CREATE INDEX idx_district_metadata_sdorgid ON public.district_metadata USING btree (sdorgid);

CREATE INDEX idx_districts_geometry_geom_gist ON public.districts USING gist (geometry_geom);


CREATE INDEX idx_districts_sdorgid ON public.districts USING btree (sdorgid);

CREATE UNIQUE INDEX subscriptions_stripe_subscription_id_key ON public.subscriptions USING btree (stripe_subscription_id);

alter table "public"."donations" add constraint "donations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."donations" validate constraint "donations_user_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_district_id_fkey" FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_district_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_stripe_subscription_id_key" UNIQUE using index "subscriptions_stripe_subscription_id_key";

alter table "public"."subscriptions" add constraint "subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_user_id_fkey";

alter table "public"."donations" add constraint "donations_district_id_fkey" FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL not valid;

alter table "public"."donations" validate constraint "donations_district_id_fkey";

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'geometry_dump'
  ) then
    create type public.geometry_dump as ("path" integer[], "geom" geometry);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'valid_detail'
  ) then
    create type public.valid_detail as ("valid" boolean, "reason" character varying, "location" geometry);
  end if;
end $$;

grant delete on table "public"."spatial_ref_sys" to "anon";

grant insert on table "public"."spatial_ref_sys" to "anon";

grant references on table "public"."spatial_ref_sys" to "anon";

grant select on table "public"."spatial_ref_sys" to "anon";

grant trigger on table "public"."spatial_ref_sys" to "anon";

grant truncate on table "public"."spatial_ref_sys" to "anon";

grant update on table "public"."spatial_ref_sys" to "anon";

grant delete on table "public"."spatial_ref_sys" to "authenticated";

grant insert on table "public"."spatial_ref_sys" to "authenticated";

grant references on table "public"."spatial_ref_sys" to "authenticated";

grant select on table "public"."spatial_ref_sys" to "authenticated";

grant trigger on table "public"."spatial_ref_sys" to "authenticated";

grant truncate on table "public"."spatial_ref_sys" to "authenticated";

grant update on table "public"."spatial_ref_sys" to "authenticated";

grant delete on table "public"."spatial_ref_sys" to "postgres";

grant insert on table "public"."spatial_ref_sys" to "postgres";

grant references on table "public"."spatial_ref_sys" to "postgres";

grant select on table "public"."spatial_ref_sys" to "postgres";

grant trigger on table "public"."spatial_ref_sys" to "postgres";

grant truncate on table "public"."spatial_ref_sys" to "postgres";

grant update on table "public"."spatial_ref_sys" to "postgres";

grant delete on table "public"."spatial_ref_sys" to "service_role";

grant insert on table "public"."spatial_ref_sys" to "service_role";

grant references on table "public"."spatial_ref_sys" to "service_role";

grant select on table "public"."spatial_ref_sys" to "service_role";

grant trigger on table "public"."spatial_ref_sys" to "service_role";

grant truncate on table "public"."spatial_ref_sys" to "service_role";

grant update on table "public"."spatial_ref_sys" to "service_role";

