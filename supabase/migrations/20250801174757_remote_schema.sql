create table "public"."district_metadata" (
    "sdorgid" text not null,
    "logo_path" text,
    "extra_info" jsonb
);


CREATE UNIQUE INDEX district_metadata_pkey ON public.district_metadata USING btree (sdorgid);

alter table "public"."district_metadata" add constraint "district_metadata_pkey" PRIMARY KEY using index "district_metadata_pkey";

alter table "public"."district_metadata" add constraint "district_metadata_sdorgid_fkey" FOREIGN KEY (sdorgid) REFERENCES districts(sdorgid) not valid;

alter table "public"."district_metadata" validate constraint "district_metadata_sdorgid_fkey";

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


