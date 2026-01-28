
  create table "public"."donations" (
    "id" uuid not null default gen_random_uuid(),
    "amount" integer not null,
    "currency" text default 'usd'::text,
    "donor_email" text,
    "stripe_session_id" text,
    "subscription_id" text,
    "type" text,
    "created_at" timestamp with time zone default now(),
    "district_id" uuid
      );



  create table "public"."subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "subscription_id" text not null,
    "donor_email" text,
    "status" text default 'active'::text,
    "currency" text default 'usd'::text,
    "amount" integer not null,
    "created_at" timestamp with time zone default now(),
    "canceled_at" timestamp with time zone
      );


CREATE UNIQUE INDEX donations_pkey ON public.donations USING btree (id);

CREATE UNIQUE INDEX donations_stripe_session_id_key ON public.donations USING btree (stripe_session_id);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

CREATE UNIQUE INDEX subscriptions_subscription_id_key ON public.subscriptions USING btree (subscription_id);

alter table "public"."donations" add constraint "donations_pkey" PRIMARY KEY using index "donations_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."donations" add constraint "donations_district_id_fkey" FOREIGN KEY (district_id) REFERENCES districts(id) not valid;

alter table "public"."donations" validate constraint "donations_district_id_fkey";

alter table "public"."donations" add constraint "donations_stripe_session_id_key" UNIQUE using index "donations_stripe_session_id_key";

alter table "public"."donations" add constraint "donations_type_check" CHECK ((type = ANY (ARRAY['one-time'::text, 'recurring-renewal'::text]))) not valid;

alter table "public"."donations" validate constraint "donations_type_check";

alter table "public"."subscriptions" add constraint "subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'canceled'::text, 'past_due'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_status_check";

alter table "public"."subscriptions" add constraint "subscriptions_subscription_id_key" UNIQUE using index "subscriptions_subscription_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  insert into public.profiles (id, username, role, updated_at)
  values (new.id, new.id, 'Patron', now())
  on conflict (id) do nothing;

  return new;
end;$function$
;

grant delete on table "public"."donations" to "anon";

grant insert on table "public"."donations" to "anon";

grant references on table "public"."donations" to "anon";

grant select on table "public"."donations" to "anon";

grant trigger on table "public"."donations" to "anon";

grant truncate on table "public"."donations" to "anon";

grant update on table "public"."donations" to "anon";

grant delete on table "public"."donations" to "authenticated";

grant insert on table "public"."donations" to "authenticated";

grant references on table "public"."donations" to "authenticated";

grant select on table "public"."donations" to "authenticated";

grant trigger on table "public"."donations" to "authenticated";

grant truncate on table "public"."donations" to "authenticated";

grant update on table "public"."donations" to "authenticated";

grant delete on table "public"."donations" to "service_role";

grant insert on table "public"."donations" to "service_role";

grant references on table "public"."donations" to "service_role";

grant select on table "public"."donations" to "service_role";

grant trigger on table "public"."donations" to "service_role";

grant truncate on table "public"."donations" to "service_role";

grant update on table "public"."donations" to "service_role";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";


