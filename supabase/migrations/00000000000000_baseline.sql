

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
-- Ensure extension-provided types (e.g. geometry) resolve during baseline execution
SELECT pg_catalog.set_config('search_path', 'extensions, public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "branding";


ALTER SCHEMA "branding" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "extensions";


ALTER SCHEMA "extensions" OWNER TO "postgres";

-- PostGIS must be installed before any functions/tables reference the geometry type.
-- In Supabase, extensions typically live in the `extensions` schema.
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Optional but commonly useful; keep commented unless you know you need them.
-- CREATE EXTENSION IF NOT EXISTS postgis_topology WITH SCHEMA extensions;
-- CREATE EXTENSION IF NOT EXISTS postgis_raster WITH SCHEMA extensions;


CREATE SCHEMA IF NOT EXISTS "governance";


ALTER SCHEMA "governance" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "irs";


ALTER SCHEMA "irs" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "branding"."color_role" AS ENUM (
    'primary',
    'secondary',
    'accent'
);


ALTER TYPE "branding"."color_role" OWNER TO "postgres";


CREATE TYPE "branding"."logo_category" AS ENUM (
    'full_color',
    'stacked',
    'horizontal',
    'one_color_white',
    'one_color_black',
    'one_color_red',
    'inverse',
    'pattern_small',
    'pattern_large',
    'other'
);


ALTER TYPE "branding"."logo_category" OWNER TO "postgres";


CREATE TYPE "branding"."logo_subcategory" AS ENUM (
    'district_primary',
    'district_secondary',
    'icon',
    'school_logo',
    'community_ed',
    'athletics_primary',
    'athletics_icon',
    'athletics_wordmark',
    'script_wordmark',
    'wings_up',
    'team_logo',
    'brand_pattern',
    'retired',
    'primary_logo',
    'secondary_logo',
    'wordmark',
    'seal',
    'co_brand',
    'event',
    'program'
);


ALTER TYPE "branding"."logo_subcategory" OWNER TO "postgres";


CREATE TYPE "branding"."pattern_type" AS ENUM (
    'none',
    'dots',
    'stripes',
    'grid',
    'chevrons',
    'waves'
);


ALTER TYPE "branding"."pattern_type" OWNER TO "postgres";


CREATE TYPE "branding"."typography_role" AS ENUM (
    'header1',
    'header2',
    'subheader',
    'body',
    'logo',
    'display'
);


ALTER TYPE "branding"."typography_role" OWNER TO "postgres";


CREATE TYPE "governance"."approval_target_type" AS ENUM (
    'meeting_minutes',
    'document_version',
    'motion'
);


ALTER TYPE "governance"."approval_target_type" OWNER TO "postgres";


CREATE TYPE "governance"."meeting_status" AS ENUM (
    'scheduled',
    'in_session',
    'adjourned',
    'cancelled'
);


ALTER TYPE "governance"."meeting_status" OWNER TO "postgres";


CREATE TYPE "governance"."minutes_status" AS ENUM (
    'draft',
    'finalized',
    'amended'
);


ALTER TYPE "governance"."minutes_status" OWNER TO "postgres";


CREATE TYPE "irs"."irs_doc_type" AS ENUM (
    'pdf',
    'xml',
    'other'
);


ALTER TYPE "irs"."irs_doc_type" OWNER TO "postgres";


CREATE TYPE "irs"."irs_narrative_section" AS ENUM (
    'part_iii',
    'schedule_o',
    'schedule_d',
    'schedule_a',
    'other'
);


ALTER TYPE "irs"."irs_narrative_section" OWNER TO "postgres";


CREATE TYPE "irs"."irs_person_role" AS ENUM (
    'officer',
    'director',
    'trustee',
    'key_employee',
    'highest_compensated',
    'independent_contractor',
    'other'
);


ALTER TYPE "irs"."irs_person_role" OWNER TO "postgres";


CREATE TYPE "irs"."irs_restriction_type" AS ENUM (
    'endowment',
    'donor_restricted',
    'temporarily_restricted',
    'permanently_restricted',
    'board_designated',
    'scholarship_restriction',
    'program_restriction',
    'geographic_restriction',
    'other'
);


ALTER TYPE "irs"."irs_restriction_type" OWNER TO "postgres";


CREATE TYPE "irs"."irs_return_type" AS ENUM (
    '990',
    '990EZ',
    '990PF',
    '990N',
    'unknown'
);


ALTER TYPE "irs"."irs_return_type" OWNER TO "postgres";


CREATE TYPE "public"."app_permission" AS ENUM (
    'channels.delete',
    'messages.delete'
);


ALTER TYPE "public"."app_permission" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'moderator'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."campaign_type" AS ENUM (
    'Primary',
    'Secondary'
);


ALTER TYPE "public"."campaign_type" OWNER TO "postgres";


CREATE TYPE "public"."document_status" AS ENUM (
    'active',
    'archived'
);


ALTER TYPE "public"."document_status" OWNER TO "postgres";


CREATE TYPE "public"."document_type" AS ENUM (
    'articles_of_incorporation',
    'irs_determination_letter',
    'ein_letter',
    'bylaws',
    'conflict_of_interest_policy',
    'whistleblower_policy',
    'document_retention_policy',
    'financial_controls_policy',
    'expense_reimbursement_policy',
    'gift_acceptance_policy',
    'grant_management_policy',
    'form_990',
    'state_annual_report',
    'meeting_minutes',
    'other',
    'board_packet'
);


ALTER TYPE "public"."document_type" OWNER TO "postgres";


CREATE TYPE "public"."document_version_status" AS ENUM (
    'draft',
    'in_review',
    'approved',
    'rejected',
    'superseded'
);


ALTER TYPE "public"."document_version_status" OWNER TO "postgres";


CREATE TYPE "public"."document_visibility" AS ENUM (
    'public',
    'internal',
    'board_only'
);


ALTER TYPE "public"."document_visibility" OWNER TO "postgres";


CREATE TYPE "public"."donation_type" AS ENUM (
    'platform',
    'district'
);


ALTER TYPE "public"."donation_type" OWNER TO "postgres";


CREATE TYPE "public"."entity_user_role" AS ENUM (
    'admin',
    'editor',
    'viewer',
    'employee'
);


ALTER TYPE "public"."entity_user_role" OWNER TO "postgres";


CREATE TYPE "public"."org_type" AS ENUM (
    'district_foundation',
    'up_the_ante',
    'external_charity'
);


ALTER TYPE "public"."org_type" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'ONLINE',
    'OFFLINE'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "branding"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "branding"."touch_updated_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "governance"."_object_exists"("p_schema" "text", "p_name" "text", "p_kind" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = p_schema
      and c.relname = p_name
      and c.relkind = p_kind
  );
$$;


ALTER FUNCTION "governance"."_object_exists"("p_schema" "text", "p_name" "text", "p_kind" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."approve_document_version"("p_document_version_id" "uuid", "p_meeting_id" "uuid" DEFAULT NULL::"uuid", "p_signature_hash" "text" DEFAULT NULL::"text", "p_approval_method" "text" DEFAULT NULL::"text", "p_ip" "inet" DEFAULT NULL::"inet") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'governance', 'public'
    AS $$
declare
  v_entity_id uuid;
  v_board_id uuid;
  v_board_member_id uuid;
  v_approval_id uuid;
  v_now timestamptz := now();
begin
  -- Resolve entity from document_version -> document
  select d.entity_id
    into v_entity_id
  from public.document_versions dv
  join public.documents d on d.id = dv.document_id
  where dv.id = p_document_version_id;

  if v_entity_id is null then
    raise exception 'Document version not found';
  end if;

  -- Auth gate: global admin OR entity admin OR board chair
  if not (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(v_entity_id)
    or governance.is_board_chair(v_entity_id, auth.uid())
  ) then
    raise exception 'Not authorized to approve documents for this entity';
  end if;

  -- If meeting provided, ensure it belongs to this entity (via board)
  if p_meeting_id is not null then
    select mtg.board_id
      into v_board_id
    from governance.board_meetings mtg
    join governance.boards b on b.id = mtg.board_id
    where mtg.id = p_meeting_id
      and b.entity_id = v_entity_id;

    if v_board_id is null then
      raise exception 'Meeting not found or does not belong to this entity';
    end if;
  else
    -- derive a board_id if the entity has one (for board_member resolution)
    select b.id into v_board_id
    from governance.boards b
    where b.entity_id = v_entity_id
    limit 1;
  end if;

  -- Resolve board_member_id (approvals.board_member_id is NOT NULL)
  select bm.id
    into v_board_member_id
  from governance.board_members bm
  where bm.board_id = v_board_id
    and bm.user_id = auth.uid()
    and bm.status = 'active'
    and bm.term_start <= current_date
    and (bm.term_end is null or bm.term_end >= current_date)
  limit 1;

  if v_board_member_id is null then
    raise exception 'Approver must be an active board member for this board';
  end if;

  -- Prevent double approval
  if exists (
    select 1
    from governance.approvals a
    where a.target_type = 'document_version'::governance.approval_target_type
      and a.target_id = p_document_version_id
  ) then
    raise exception 'Document version already approved';
  end if;

  -- Stamp approval on the version
  update public.document_versions
  set approved_at = v_now,
      approved_by = auth.uid(),
      approved_by_meeting_id = p_meeting_id,
      status = 'approved'::public.document_version_status
  where id = p_document_version_id;

  -- Audit row
  insert into governance.approvals (
    entity_id,
    target_type,
    target_id,
    board_member_id,
    approval_method,
    signature_hash,
    ip_address,
    approved_at
  ) values (
    v_entity_id,
    'document_version'::governance.approval_target_type,
    p_document_version_id,
    v_board_member_id,
    coalesce(p_approval_method, 'in_app'),
    coalesce(p_signature_hash, ''),
    p_ip,
    v_now
  )
  returning id into v_approval_id;

  return v_approval_id;
end;
$$;


ALTER FUNCTION "governance"."approve_document_version"("p_document_version_id" "uuid", "p_meeting_id" "uuid", "p_signature_hash" "text", "p_approval_method" "text", "p_ip" "inet") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."approve_meeting_minutes"("p_meeting_id" "uuid", "p_signature_hash" "text" DEFAULT NULL::"text", "p_approval_method" "text" DEFAULT 'in_app'::"text", "p_ip" "inet" DEFAULT NULL::"inet") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_entity_id uuid;
  v_board_id uuid;
  v_minutes_id uuid;
  v_board_member_id uuid;
  v_now timestamptz := now();
  v_approval_id uuid;
begin
  -- derive board + entity from the meeting
  select mtg.board_id, b.entity_id
    into v_board_id, v_entity_id
  from governance.board_meetings mtg
  join governance.boards b on b.id = mtg.board_id
  where mtg.id = p_meeting_id;

  if v_board_id is null or v_entity_id is null then
    raise exception 'Meeting not found or not linked to a board/entity';
  end if;

  -- authorization gate:
  if not (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(v_entity_id)
    or governance.is_board_chair(v_entity_id)
  ) then
    raise exception 'Not authorized to approve minutes for this entity';
  end if;

  -- find minutes row
  select mm.id
    into v_minutes_id
  from governance.meeting_minutes mm
  where mm.meeting_id = p_meeting_id;

  if v_minutes_id is null then
    raise exception 'No minutes exist for meeting %', p_meeting_id;
  end if;

  -- prevent double approval
  if exists (
    select 1 from governance.meeting_minutes mm
    where mm.id = v_minutes_id and mm.approved_at is not null
  ) then
    raise exception 'Minutes already approved for meeting %', p_meeting_id;
  end if;

  -- resolve board_member_id for caller (required unless global admin)
  select bm.id
    into v_board_member_id
  from governance.board_members bm
  where bm.board_id = v_board_id
    and bm.user_id = auth.uid()
    and bm.status = 'active'
    and bm.term_start <= current_date
    and (bm.term_end is null or bm.term_end >= current_date)
  limit 1;

  if v_board_member_id is null and not public.is_global_admin(auth.uid()) then
    raise exception 'Approver must be an active board member for this board';
  end if;

  -- update minutes approval fields
  update governance.meeting_minutes mm
  set approved_at = v_now,
      approved_by = auth.uid(),
      draft = false
  where mm.id = v_minutes_id;

  -- insert approval audit record
  insert into governance.approvals (
    entity_id,
    target_type,
    target_id,
    board_member_id,
    approval_method,
    signature_hash,
    ip_address,
    approved_at
  ) values (
    v_entity_id,
    'meeting_minutes'::governance.approval_target_type,
    v_minutes_id,
    v_board_member_id,
    coalesce(p_approval_method, 'in_app'),
    coalesce(p_signature_hash, ''),  -- allow empty until you enforce
    p_ip,
    v_now
  )
  returning id into v_approval_id;

  return v_approval_id;
end;
$$;


ALTER FUNCTION "governance"."approve_meeting_minutes"("p_meeting_id" "uuid", "p_signature_hash" "text", "p_approval_method" "text", "p_ip" "inet") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."assert_can_adjourn_meeting"("p_board_id" "uuid", "p_presiding_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_uid uuid := governance.current_user_id();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Presiding officer can always adjourn
  if p_presiding_user_id is not null and v_uid = p_presiding_user_id then
    return;
  end if;

  -- Otherwise allow any officer
  if governance.is_board_officer(p_board_id, v_uid) then
    return;
  end if;

  -- Later enhancement: allow majority vote to adjourn (requires recorded motion/vote)
  raise exception 'Only the presiding officer (or an officer) may adjourn this meeting' using errcode = '42501';
end $$;


ALTER FUNCTION "governance"."assert_can_adjourn_meeting"("p_board_id" "uuid", "p_presiding_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."assert_can_start_meeting"("p_board_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_uid uuid := governance.current_user_id();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- STRICT (officers only):
  -- if not governance.is_board_officer(p_board_id, v_uid) then
  --   raise exception 'Only an officer may start/call this meeting' using errcode = '42501';
  -- end if;

  -- DEFAULT (officer OR any board member):
  if not governance.is_board_officer(p_board_id, v_uid)
     and not governance.is_board_member(p_board_id, v_uid) then
    raise exception 'Only a board member may start/call this meeting' using errcode = '42501';
  end if;
end $$;


ALTER FUNCTION "governance"."assert_can_start_meeting"("p_board_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."can_read_board"("p_board_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
begin
  if to_regprocedure('governance.is_board_member_for_board(uuid,uuid)') is not null then
    return governance.is_board_member_for_board(p_board_id, p_user_id);
  end if;

  return exists (
    select 1
    from governance.board_members bm
    where bm.board_id = p_board_id
      and bm.user_id = p_user_id
      and bm.status = 'active'
      and bm.term_start <= current_date
      and (bm.term_end is null or bm.term_end >= current_date)
  );
end;
$$;


ALTER FUNCTION "governance"."can_read_board"("p_board_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."can_read_entity"("p_entity_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
begin
  if to_regprocedure('public.is_global_admin(uuid)') is not null
     and public.is_global_admin(p_user_id)
  then
    return true;
  end if;

  if to_regprocedure('public.is_entity_admin(uuid,uuid)') is not null then
    return public.is_entity_admin(p_entity_id, p_user_id);
  elsif to_regprocedure('public.is_entity_admin(uuid)') is not null then
    -- 1-arg variant resolves auth.uid() internally
    return public.is_entity_admin(p_entity_id);
  else
    return false;
  end if;
end;
$$;


ALTER FUNCTION "governance"."can_read_entity"("p_entity_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."can_read_meeting"("p_meeting_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from governance.board_meetings m
    join governance.boards b on b.id = m.board_id
    where m.id = p_meeting_id
      and (
        governance.can_read_entity(b.entity_id, p_user_id)
        or governance.can_read_board(m.board_id, p_user_id)
      )
  );
$$;


ALTER FUNCTION "governance"."can_read_meeting"("p_meeting_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."create_board_packet_for_meeting"("p_meeting_id" "uuid", "p_title" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'governance', 'public'
    AS $$
declare
  v_entity_id uuid;
  v_document_id uuid;
  v_version_id uuid;
  v_existing uuid;
  v_document_type public.document_type;
begin
  select b.entity_id, bm.board_packet_document_id
    into v_entity_id, v_existing
  from governance.board_meetings bm
  join governance.boards b on b.id = bm.board_id
  where bm.id = p_meeting_id;

  if v_entity_id is null then
    raise exception 'Meeting not found';
  end if;

  if v_existing is not null then
    raise exception 'Board packet already exists';
  end if;

  if not (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(v_entity_id, auth.uid())
    or governance.is_board_chair(v_entity_id, auth.uid())
  ) then
    raise exception 'Not authorized';
  end if;

  if exists (
    select 1
    from unnest(enum_range(null::public.document_type)) as t(val)
    where val = 'board_packet'
  ) then
    v_document_type := 'board_packet';
  else
    v_document_type := 'other';
  end if;

  insert into public.documents (entity_id, title, document_type, visibility, status, created_by)
  values (v_entity_id, coalesce(p_title, 'Board Packet'), v_document_type, 'board_only', 'active', auth.uid())
  returning id into v_document_id;

  insert into public.document_versions (document_id, status, content_md, created_by, version_number)
  values (v_document_id, 'draft', '# Board Packet\n\n', auth.uid(), 1)
  returning id into v_version_id;

  update public.documents
    set current_version_id = v_version_id
    where id = v_document_id;

  update governance.board_meetings
    set board_packet_document_id = v_document_id,
        board_packet_version_id = v_version_id
    where id = p_meeting_id;

  return jsonb_build_object(
    'document_id', v_document_id,
    'version_id', v_version_id
  );
end;
$$;


ALTER FUNCTION "governance"."create_board_packet_for_meeting"("p_meeting_id" "uuid", "p_title" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select auth.uid();
$$;


ALTER FUNCTION "governance"."current_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."enforce_meeting_packet_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_doc_id uuid;
begin
  if new.board_packet_version_id is null then
    return new;
  end if;

  select dv.document_id into v_doc_id
  from public.document_versions dv
  where dv.id = new.board_packet_version_id;

  if v_doc_id is null then
    raise exception 'board_packet_version_id % not found', new.board_packet_version_id;
  end if;

  if new.board_packet_document_id is null then
    new.board_packet_document_id := v_doc_id;
  elsif new.board_packet_document_id <> v_doc_id then
    raise exception 'board_packet_version_id % does not belong to board_packet_document_id %',
      new.board_packet_version_id, new.board_packet_document_id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "governance"."enforce_meeting_packet_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."enforce_votes_open"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'governance', 'public'
    AS $$
declare
  v_status text;
  v_finalized_at timestamptz;
begin
  select status, finalized_at
    into v_status, v_finalized_at
  from governance.motions
  where id = new.motion_id;

  if v_status is null then
    raise exception 'Motion not found';
  end if;

  -- closed if finalized_at is set OR status is terminal (must match motions_status_check)
  if v_finalized_at is not null
     or v_status in ('passed', 'failed', 'tabled') then
    raise exception 'Voting is closed for this motion';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "governance"."enforce_votes_open"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "governance"."board_meetings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "board_id" "uuid" NOT NULL,
    "title" "text",
    "meeting_type" "text" DEFAULT 'regular'::"text" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "scheduled_start" timestamp with time zone,
    "scheduled_end" timestamp with time zone,
    "started_at" timestamp with time zone,
    "adjourned_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "presiding_user_id" "uuid",
    "called_by_user_id" "uuid",
    "finalized_at" timestamp with time zone,
    "finalized_by" "uuid",
    "finalized_signature_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "board_meetings_adjourned_status_check" CHECK ((("adjourned_at" IS NULL) OR ("status" = 'adjourned'::"text"))),
    CONSTRAINT "board_meetings_meeting_type_check" CHECK (("meeting_type" = ANY (ARRAY['regular'::"text", 'special'::"text", 'emergency'::"text", 'annual'::"text"]))),
    CONSTRAINT "board_meetings_status_allowed_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'in_progress'::"text", 'adjourned'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "governance"."board_meetings" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."finalize_meeting"("p_meeting_id" "uuid", "p_signature_hash" "text" DEFAULT NULL::"text") RETURNS "governance"."board_meetings"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'governance', 'public'
    AS $_$
declare
  v_meeting governance.board_meetings;
  v_actor_user_id uuid;
  v_actor_board_member_id uuid;
  v_has_is_quorum_met boolean;
  v_quorum_met boolean;

  v_minutes_id uuid;
  v_minutes_json jsonb;
  v_minutes_md text;

  v_has_attendance_table boolean;
  v_has_motions_table boolean;
  v_has_votes_table boolean;

  v_present jsonb;
  v_absent jsonb;
  v_motions jsonb;
begin
  if p_meeting_id is null then
    raise exception 'p_meeting_id is required';
  end if;

  -- Lock the meeting row so finalization is atomic.
  select * into v_meeting
  from governance.board_meetings
  where id = p_meeting_id
  for update;

  if not found then
    raise exception 'Meeting % not found', p_meeting_id;
  end if;

  if v_meeting.status::text = 'cancelled' then
    raise exception 'Cannot finalize a cancelled meeting';
  end if;

  if v_meeting.finalized_at is not null then
    raise exception 'Meeting is already finalized at %', v_meeting.finalized_at;
  end if;

  -- Actor
  v_actor_user_id := auth.uid();
  if v_actor_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Map actor to board_member on this board
  select bm.id into v_actor_board_member_id
  from governance.board_members bm
  where bm.board_id = v_meeting.board_id
    and bm.user_id = v_actor_user_id
  limit 1;

  if v_actor_board_member_id is null then
    raise exception 'Current user is not a board member for board %', v_meeting.board_id;
  end if;

  -- 1) Check quorum
  -- Prefer existing function governance.is_quorum_met(uuid) if it exists.
  select exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'governance'
      and p.proname = 'is_quorum_met'
      and pg_get_function_identity_arguments(p.oid) = 'p_meeting_id uuid'
  ) into v_has_is_quorum_met;

  if v_has_is_quorum_met then
    execute 'select governance.is_quorum_met($1)' into v_quorum_met using p_meeting_id;
  else
    raise exception 'Missing governance.is_quorum_met(p_meeting_id uuid). Create it or adjust finalize_meeting to your quorum rules.';
  end if;

  if not v_quorum_met then
    raise exception 'Quorum not met for meeting %', p_meeting_id;
  end if;

  -- 2) Lock votes/motions
  -- We use meeting.finalized_at as the canonical lock flag.
  -- If your schema includes vote/motion tables, you can additionally key enforcement off meeting.finalized_at.

  -- 3) Generate minutes draft
  v_has_attendance_table := governance._object_exists('governance', 'meeting_attendance', 'r');
  v_has_motions_table := governance._object_exists('governance', 'motions', 'r');
  v_has_votes_table := governance._object_exists('governance', 'votes', 'r');

  -- Attendance (best-effort)
  v_present := '[]'::jsonb;
  v_absent := '[]'::jsonb;

  if v_has_attendance_table then
    -- Expected columns (best effort): meeting_id, board_member_id, status ('present'/'absent')
    -- If your schema differs, this will fail loudly so we can adjust.
    begin
      select coalesce(jsonb_agg(jsonb_build_object(
        'board_member_id', a.board_member_id,
        'status', a.status
      ) order by a.board_member_id), '[]'::jsonb)
      into v_present
      from governance.meeting_attendance a
      where a.meeting_id = p_meeting_id
        and a.status = 'present';

      select coalesce(jsonb_agg(jsonb_build_object(
        'board_member_id', a.board_member_id,
        'status', a.status
      ) order by a.board_member_id), '[]'::jsonb)
      into v_absent
      from governance.meeting_attendance a
      where a.meeting_id = p_meeting_id
        and a.status = 'absent';
    exception
      when undefined_column then
        -- Keep empty arrays; schema mismatch.
        v_present := '[]'::jsonb;
        v_absent := '[]'::jsonb;
    end;
  end if;

  -- Motions + vote summaries (best-effort)
  v_motions := '[]'::jsonb;
  if v_has_motions_table then
    begin
      if v_has_votes_table then
        -- Expected columns: motions.id, motions.meeting_id, motions.title, motions.status
        -- votes: motion_id, board_member_id, vote ('yes'/'no'/'abstain')
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'motion_id', m.id,
              'title', m.title,
              'status', m.status,
              'vote_summary', jsonb_build_object(
                'yes', (
                  select count(*) from governance.votes v where v.motion_id = m.id and v.vote = 'yes'
                ),
                'no', (
                  select count(*) from governance.votes v where v.motion_id = m.id and v.vote = 'no'
                ),
                'abstain', (
                  select count(*) from governance.votes v where v.motion_id = m.id and v.vote = 'abstain'
                )
              )
            )
            order by m.created_at
          ),
          '[]'::jsonb
        )
        into v_motions
        from governance.motions m
        where m.meeting_id = p_meeting_id;
      else
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'motion_id', m.id,
              'title', m.title,
              'status', m.status
            )
            order by m.created_at
          ),
          '[]'::jsonb
        )
        into v_motions
        from governance.motions m
        where m.meeting_id = p_meeting_id;
      end if;
    exception
      when undefined_column then
        v_motions := '[]'::jsonb;
    end;
  end if;

  v_minutes_json := jsonb_build_object(
    'meeting_id', p_meeting_id,
    'board_id', v_meeting.board_id,
    'generated_at', now(),
    'call_to_order', v_meeting.started_at,
    'adjourned_at', v_meeting.adjourned_at,
    'attendance', jsonb_build_object(
      'present', v_present,
      'absent', v_absent
    ),
    'motions', v_motions
  );

  v_minutes_md :=
    '# Meeting Minutes\n\n'
    || '**Meeting:** ' || coalesce(v_meeting.title, '(untitled)') || '\n\n'
    || '**Scheduled:** ' || coalesce(v_meeting.scheduled_start::text, '') || ' – ' || coalesce(v_meeting.scheduled_end::text, '') || '\n\n'
    || case when v_meeting.started_at is not null then '**Call to Order:** ' || v_meeting.started_at::text || '\n\n' else '' end
    || case when v_meeting.adjourned_at is not null then '**Adjourned:** ' || v_meeting.adjourned_at::text || '\n\n' else '' end
    || '## Attendance\n\n'
    || '- Present: ' || jsonb_array_length(v_present)::text || '\n'
    || '- Absent: ' || jsonb_array_length(v_absent)::text || '\n\n'
    || '## Motions\n\n'
    || case
         when jsonb_typeof(v_motions) = 'array' and jsonb_array_length(v_motions) > 0 then
           (select string_agg(
             '- ' || coalesce((x->>'title'), '(untitled motion)') || ' — ' || coalesce((x->>'status'), '')
             || case when (x ? 'vote_summary') then
                  ' (Yes: ' || coalesce((x->'vote_summary'->>'yes'),'0')
                  || ', No: ' || coalesce((x->'vote_summary'->>'no'),'0')
                  || ', Abstain: ' || coalesce((x->'vote_summary'->>'abstain'),'0')
                  || ')'
                else '' end,
             E'\n'
           ) from jsonb_array_elements(v_motions) as x)
         else
           '_(No motions recorded)_'
       end
    || '\n';

  -- Upsert minutes row
  select id into v_minutes_id
  from governance.meeting_minutes
  where meeting_id = p_meeting_id
  for update;

  if v_minutes_id is null then
    insert into governance.meeting_minutes (
      meeting_id,
      status,
      content_json,
      content_md,
      content
    ) values (
      p_meeting_id,
      'draft'::governance.minutes_status,
      v_minutes_json,
      v_minutes_md,
      v_minutes_md
    )
    returning id into v_minutes_id;
  else
    update governance.meeting_minutes
      set status = 'draft'::governance.minutes_status,
          content_json = v_minutes_json,
          content_md = v_minutes_md,
          content = coalesce(content, v_minutes_md)
    where id = v_minutes_id;
  end if;

  -- 4) Finalize the meeting
  update governance.board_meetings
    set finalized_at = now(),
        finalized_by = v_actor_board_member_id,
        finalized_signature_hash = p_signature_hash
  where id = p_meeting_id
  returning * into v_meeting;

  return v_meeting;
end;
$_$;


ALTER FUNCTION "governance"."finalize_meeting"("p_meeting_id" "uuid", "p_signature_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."finalize_motion"("p_motion_id" "uuid", "p_signature_hash" "text" DEFAULT NULL::"text", "p_approval_method" "text" DEFAULT NULL::"text", "p_ip" "inet" DEFAULT NULL::"inet") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'governance', 'public'
    AS $$
declare
  v_entity_id uuid;
  v_meeting_id uuid;
  v_board_id uuid;
  v_board_member_id uuid;
  v_yes int := 0;
  v_no int := 0;
  v_new_status text;
  v_now timestamptz := now();
  v_approval_id uuid;
  v_already_finalized boolean;
begin
  -- get meeting_id from motion
  select m.meeting_id,
         (m.finalized_at is not null)
    into v_meeting_id, v_already_finalized
  from governance.motions m
  where m.id = p_motion_id;

  if v_meeting_id is null then
    raise exception 'Motion not found';
  end if;

  if v_already_finalized then
    raise exception 'Motion already finalized';
  end if;

  -- derive entity + board from meeting
  select mtg.board_id, b.entity_id
    into v_board_id, v_entity_id
  from governance.board_meetings mtg
  join governance.boards b on b.id = mtg.board_id
  where mtg.id = v_meeting_id;

  if v_board_id is null or v_entity_id is null then
    raise exception 'Meeting not found or not linked to a board/entity';
  end if;

  -- quorum gate (server enforced)
  if not governance.is_quorum_met(v_meeting_id) then
    raise exception 'Quorum not met';
  end if;

  -- authorization: only chair/admin/global can finalize
  if not (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(v_entity_id)
    or governance.is_board_chair(v_entity_id)
  ) then
    raise exception 'Not authorized to finalize motion for this entity';
  end if;

  -- resolve board_member_id for caller (required unless global admin)
  select bm.id
    into v_board_member_id
  from governance.board_members bm
  where bm.board_id = v_board_id
    and bm.user_id = auth.uid()
    and bm.status = 'active'
    and bm.term_start <= current_date
    and (bm.term_end is null or bm.term_end >= current_date)
  limit 1;

  if v_board_member_id is null and not public.is_global_admin(auth.uid()) then
    raise exception 'Approver must be an active board member for this board';
  end if;

  -- count votes
  select
  count(*) filter (where v.vote = 'yes')::int,
  count(*) filter (where v.vote = 'no')::int
into v_yes, v_no
from governance.votes v
where v.motion_id = p_motion_id;

  -- decide final status (must match motions_status_check)
  if v_yes > v_no then
    v_new_status := 'passed';
  elsif v_no >= v_yes then
    v_new_status := 'failed';
  end if;

  -- update motion
  update governance.motions
  set status = v_new_status,
      finalized_at = v_now
  where id = p_motion_id;

  -- audit approval row (target_type enum includes 'motion')
  insert into governance.approvals (
    entity_id,
    target_type,
    target_id,
    board_member_id,
    approval_method,
    signature_hash,
    ip_address,
    approved_at
  ) values (
    v_entity_id,
    'motion'::governance.approval_target_type,
    p_motion_id,
    v_board_member_id,
    coalesce(p_approval_method, 'in_app'),
    coalesce(nullif(trim(p_signature_hash), ''), ''), -- keep permissive unless you enforce it
    p_ip,
    v_now
  )
  returning id into v_approval_id;

  return v_approval_id;
end;
$$;


ALTER FUNCTION "governance"."finalize_motion"("p_motion_id" "uuid", "p_signature_hash" "text", "p_approval_method" "text", "p_ip" "inet") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."is_board_chair"("p_entity_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select governance.is_board_chair(p_entity_id, auth.uid());
$$;


ALTER FUNCTION "governance"."is_board_chair"("p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."is_board_chair"("p_entity_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from governance.boards b
    join governance.board_members bm
      on bm.board_id = b.id
    where b.entity_id = p_entity_id
      and bm.user_id = p_user_id
      and bm.status = 'active'
      and bm.role = 'chair'
      and bm.term_start <= current_date
      and (bm.term_end is null or bm.term_end >= current_date)
  );
$$;


ALTER FUNCTION "governance"."is_board_chair"("p_entity_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."is_board_chair_for_board"("p_board_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from governance.board_members bm
    where bm.board_id = p_board_id
      and bm.user_id = p_user_id
      and bm.status = 'active'
      and bm.role = 'chair'
      and bm.term_start <= current_date
      and (bm.term_end is null or bm.term_end >= current_date)
  );
$$;


ALTER FUNCTION "governance"."is_board_chair_for_board"("p_board_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."is_board_member"("p_entity_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select governance.is_board_member(p_entity_id, auth.uid());
$$;


ALTER FUNCTION "governance"."is_board_member"("p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."is_board_member"("p_entity_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from governance.boards b
    join governance.board_members bm
      on bm.board_id = b.id
    where b.entity_id = p_entity_id
      and bm.user_id = p_user_id
      and bm.status = 'active'
      and bm.term_start <= current_date
      and (bm.term_end is null or bm.term_end >= current_date)
  );
$$;


ALTER FUNCTION "governance"."is_board_member"("p_entity_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."is_board_member_current"("p_board_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select governance.is_board_member_for_board(p_board_id, auth.uid());
$$;


ALTER FUNCTION "governance"."is_board_member_current"("p_board_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."is_board_member_for_board"("p_board_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from governance.board_members bm
    where bm.board_id = p_board_id
      and bm.user_id = p_user_id
      and bm.status = 'active'
      and bm.term_start <= current_date
      and (bm.term_end is null or bm.term_end >= current_date)
  );
$$;


ALTER FUNCTION "governance"."is_board_member_for_board"("p_board_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."is_board_officer"("p_board_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from governance.board_members bm
    where bm.board_id = p_board_id
      and bm.user_id = p_user_id
      and bm.status = 'active'
      and bm.role <> 'member'
      and bm.term_start <= current_date
      and (bm.term_end is null or bm.term_end >= current_date)
  );
$$;


ALTER FUNCTION "governance"."is_board_officer"("p_board_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."is_board_officer_current"("p_board_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select governance.is_board_officer(p_board_id, auth.uid());
$$;


ALTER FUNCTION "governance"."is_board_officer_current"("p_board_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."is_quorum_met"("p_meeting_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
  v_required integer;
  v_present integer;
begin
  v_required := governance.quorum_required_for_meeting(p_meeting_id);

  select count(*)
    into v_present
  from governance.meeting_attendance a
  where a.meeting_id = p_meeting_id
    and a.status = 'present';

  return v_present >= v_required;
end;
$$;


ALTER FUNCTION "governance"."is_quorum_met"("p_meeting_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."meeting_is_adjourned_for_motion"("p_motion_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from governance.motions m
    join governance.board_meetings bm on bm.id = m.meeting_id
    where m.id = p_motion_id
      and bm.status = 'adjourned'
  );
$$;


ALTER FUNCTION "governance"."meeting_is_adjourned_for_motion"("p_motion_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."prevent_approval_modifications"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  raise exception
    'Approvals are immutable and cannot be modified or deleted';
end;
$$;


ALTER FUNCTION "governance"."prevent_approval_modifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."prevent_minutes_update_when_locked"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if (old.locked_at is not null) then
    raise exception 'Meeting minutes are locked and cannot be modified.';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "governance"."prevent_minutes_update_when_locked"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."prevent_minutes_updates_after_approval"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if old.approved_at is not null then
    raise exception
      'Meeting minutes % are approved and cannot be modified',
      old.id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "governance"."prevent_minutes_updates_after_approval"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."prevent_motion_updates_after_finalize"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if old.finalized_at is not null then
    raise exception
      'Motion % is finalized and cannot be modified',
      old.id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "governance"."prevent_motion_updates_after_finalize"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."prevent_vote_updates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if exists (
    select 1 from governance.motions
    where id = old.motion_id
      and finalized_at is not null
  ) then
    raise exception 'Votes cannot be modified after motion finalization';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "governance"."prevent_vote_updates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."quorum_required_for_meeting"("p_meeting_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare
  v_board_id uuid;
  v_override integer;
  v_active_directors integer;
  v_required integer;
begin
  select bm.board_id
    into v_board_id
  from governance.board_meetings bm
  where bm.id = p_meeting_id;

  if v_board_id is null then
    raise exception 'Meeting not found';
  end if;

  select b.quorum_override_count
    into v_override
  from governance.boards b
  where b.id = v_board_id;

  -- count active directors (in-term)
  select count(*)
    into v_active_directors
  from governance.board_members m
  where m.board_id = v_board_id
    and m.status = 'active'
    and m.role = 'director'
    and m.term_start <= current_date
    and (m.term_end is null or m.term_end >= current_date);

  if v_active_directors = 0 then
    -- If no active directors, treat quorum as impossible (or 0). I prefer impossible.
    raise exception 'No active directors available to form quorum';
  end if;

  if v_override is not null then
    v_required := v_override;
  else
    -- majority = floor(n/2) + 1
    v_required := (v_active_directors / 2) + 1;
  end if;

  return v_required;
end;
$$;


ALTER FUNCTION "governance"."quorum_required_for_meeting"("p_meeting_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."set_board_packet_version"("p_meeting_id" "uuid", "p_document_version_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'governance', 'public'
    AS $$
declare
  v_entity_id uuid;
  v_document_id uuid;
begin
  select b.entity_id, dv.document_id
    into v_entity_id, v_document_id
  from governance.board_meetings bm
  join governance.boards b on b.id = bm.board_id
  join public.document_versions dv on dv.id = p_document_version_id
  join public.documents d on d.id = dv.document_id
  where bm.id = p_meeting_id
    and d.entity_id = b.entity_id;

  if v_entity_id is null then
    raise exception 'Meeting not found';
  end if;

  if not (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(v_entity_id, auth.uid())
    or governance.is_board_chair(v_entity_id, auth.uid())
  ) then
    raise exception 'Not authorized';
  end if;

  update governance.board_meetings
    set board_packet_document_id = v_document_id,
        board_packet_version_id = p_document_version_id
    where id = p_meeting_id;

  update public.documents
    set current_version_id = p_document_version_id
    where id = v_document_id;

  return true;
end;
$$;


ALTER FUNCTION "governance"."set_board_packet_version"("p_meeting_id" "uuid", "p_document_version_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."trg_board_meetings_enforce_lifecycle"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Prevent status regressions / invalid transitions
  if tg_op = 'UPDATE' then
    if old.status = 'adjourned' and new.status <> 'adjourned' then
      raise exception 'Cannot change an adjourned meeting' using errcode = '23514';
    end if;
    if old.status = 'cancelled' and new.status <> 'cancelled' then
      raise exception 'Cannot change a cancelled meeting' using errcode = '23514';
    end if;
  end if;

  -- Start meeting (scheduled -> in_session)
  if (tg_op = 'UPDATE' or tg_op = 'INSERT') then
    if new.status = 'in_session' and coalesce(old.status,'scheduled') <> 'in_session' then
      -- Only allow from scheduled
      if old.status is not null and old.status <> 'scheduled' then
        raise exception 'Meeting can only enter session from scheduled status' using errcode = '23514';
      end if;

      perform governance.assert_can_start_meeting(new.board_id);

      if new.started_at is null then
        new.started_at := now();
      end if;

      if new.called_by_user_id is null then
        new.called_by_user_id := governance.current_user_id();
      end if;

      if new.presiding_user_id is null then
        -- reasonable default: whoever started it
        new.presiding_user_id := governance.current_user_id();
      end if;
    end if;

    -- Adjourn meeting (in_session -> adjourned)
    if new.status = 'adjourned' and coalesce(old.status,'scheduled') <> 'adjourned' then
      if old.status <> 'in_session' then
        raise exception 'Meeting can only be adjourned from in_session status' using errcode = '23514';
      end if;

      perform governance.assert_can_adjourn_meeting(new.board_id, new.presiding_user_id);

      if new.adjourned_at is null then
        new.adjourned_at := now();
      end if;
    end if;
  end if;

  return new;
end $$;


ALTER FUNCTION "governance"."trg_board_meetings_enforce_lifecycle"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."trg_minutes_auto_version"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_max int;
begin
  if tg_op = 'INSERT' then
    if new.version is null then
      select coalesce(max(mm.version), 0) into v_max
      from governance.meeting_minutes mm
      where mm.meeting_id = new.meeting_id;

      new.version := v_max + 1;
    end if;
  end if;

  return new;
end $$;


ALTER FUNCTION "governance"."trg_minutes_auto_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."trg_minutes_immutable_if_finalized"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if tg_op = 'UPDATE' then
    if old.status = 'finalized' then
      raise exception 'Finalized minutes are immutable; create an amended version instead' using errcode = '23514';
    end if;
  end if;

  -- When finalizing, stamp metadata
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    if new.status = 'finalized' and coalesce(old.status,'draft') <> 'finalized' then
      if new.finalized_at is null then
        new.finalized_at := now();
      end if;
      if new.finalized_by_user_id is null then
        new.finalized_by_user_id := governance.current_user_id();
      end if;
    end if;
  end if;

  return new;
end $$;


ALTER FUNCTION "governance"."trg_minutes_immutable_if_finalized"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "governance"."trg_votes_block_after_adjournment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if governance.meeting_is_adjourned_for_motion(new.motion_id) then
    raise exception 'Votes are immutable after meeting adjournment' using errcode = '23514';
  end if;
  return new;
end $$;


ALTER FUNCTION "governance"."trg_votes_block_after_adjournment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "irs"."can_access_ein"("p_ein" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from irs.entity_links l
    where l.ein = p_ein
      and public.is_entity_admin(l.entity_id)
  );
$$;


ALTER FUNCTION "irs"."can_access_ein"("p_ein" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_geom_from_geojson_4326"("p_geojson" "jsonb") RETURNS geometry
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'extensions', 'public'
    AS $$
    select extensions.st_setsrid(extensions.st_geomfromgeojson(p_geojson::text), 4326);
$$;


ALTER FUNCTION "public"."_geom_from_geojson_4326"("p_geojson" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."authorize"("requested_permission" "public"."app_permission") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  bind_permissions int;
begin
  select count(*)
  from public.role_permissions
  where role_permissions.permission = authorize.requested_permission
    and role_permissions.role = (auth.jwt() ->> 'user_role')::public.app_role
  into bind_permissions;
  
  return bind_permissions > 0;
end;
$$;


ALTER FUNCTION "public"."authorize"("requested_permission" "public"."app_permission") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_entity_assets"("p_user_id" "uuid", "p_entity_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select public.is_global_admin(p_user_id)
      or public.is_entity_admin(p_user_id, p_entity_id);
$$;


ALTER FUNCTION "public"."can_manage_entity_assets"("p_user_id" "uuid", "p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_entity"("p_entity_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select governance.can_read_entity(p_entity_id, p_user_id);
$$;


ALTER FUNCTION "public"."can_read_entity"("p_entity_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user"("email" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth'
    AS $$
  declare
  user_id uuid;
begin
  user_id := extensions.uuid_generate_v4();
  
  insert into auth.users (id, email)
    values (user_id, email)
    returning id into user_id;

    return user_id;
end;
$$;


ALTER FUNCTION "public"."create_user"("email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  claims jsonb;
begin
  -- Start with existing claims
  claims := event->'claims';

  -- Safest: only trust app_metadata.role
  if (event->'user'->'app_metadata'->>'role') is not null then
    claims := jsonb_set(claims, '{role}', to_jsonb(event->'user'->'app_metadata'->>'role'));
  end if;

  -- Return event with updated claims
  return jsonb_set(event, '{claims}', claims);
end;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_scope_nonprofit_entity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_existing_entity_id uuid;
  v_name text;
  v_base_slug text;
  v_slug text;
  v_suffix int := 1;
begin
  -- Only act if entity_id is missing
  if new.entity_id is not null then
    return new;
  end if;

  -- Basic sanity
  if new.ein is null or length(trim(new.ein)) = 0 then
    raise exception 'superintendent_scope_nonprofits.ein cannot be null/empty';
  end if;

  v_name := coalesce(nullif(trim(new.label), ''), concat('Nonprofit ', new.ein));

  -- Try to find existing entity by EIN in external_ids
  select e.id into v_existing_entity_id
  from public.entities e
  where e.external_ids->>'ein' = new.ein
  limit 1;

  if v_existing_entity_id is not null then
    new.entity_id := v_existing_entity_id;
    return new;
  end if;

  -- Build a slug from name and ensure uniqueness for entity_type
  v_base_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
  v_base_slug := regexp_replace(v_base_slug, '(^-+|-+$)', '', 'g');
  if v_base_slug is null or length(v_base_slug) = 0 then
    v_base_slug := 'nonprofit';
  end if;

  v_slug := v_base_slug;
  loop
    exit when not exists (
      select 1 from public.entities
      where entity_type = 'nonprofit' and slug = v_slug
    );

    v_suffix := v_suffix + 1;
    if v_suffix > 50 then
      v_slug := v_base_slug || '-' || substring(md5(random()::text) from 1 for 6);
      exit;
    end if;
    v_slug := v_base_slug || '-' || v_suffix;
  end loop;

  insert into public.entities (entity_type, name, slug, external_ids)
  values (
    'nonprofit',
    v_name,
    v_slug,
    jsonb_build_object('ein', new.ein, 'source', 'superintendent_scope')
  )
  returning id into new.entity_id;

  return new;
end;
$_$;


ALTER FUNCTION "public"."ensure_scope_nonprofit_entity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (
    id,
    updated_at,
    full_name,
    first_name,
    last_name,
    avatar_url,
    role
  )
  values (
    new.id,
    now(),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      nullif(trim(concat(
        new.raw_user_meta_data->>'first_name',
        ' ',
        new.raw_user_meta_data->>'last_name'
      )), '')
    ),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_entity_admin"("p_entity_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
      select public.is_entity_admin(p_entity_id, auth.uid());
    $$;


ALTER FUNCTION "public"."is_entity_admin"("p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_entity_admin"("p_user_id" "uuid", "p_entity_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.entity_users eu
    where eu.entity_id = p_entity_id
      and eu.user_id = p_user_id
      and eu.role = 'admin'
      and eu.status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_entity_admin"("p_user_id" "uuid", "p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_entity_user"("p_user_id" "uuid", "p_entity_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.entity_users eu
    where eu.entity_id = p_entity_id
      and eu.user_id = p_user_id
      and eu.status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_entity_user"("p_user_id" "uuid", "p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_global_admin"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_global_admin"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_schools_to_districts"("p_limit" integer, "p_offset" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_rows_primary int := 0;
  v_rows_state int := 0;
begin
  -- Give this job room to run (only affects this call)
  perform set_config('statement_timeout', '10min', true);

  with
  school_batch as materialized (
    select
      e.id as school_id,
      eg.geom as school_geom
    from public.entities e
    join public.entity_geometries eg
      on eg.entity_id = e.id
     and eg.geometry_type = 'school_program_locations'
    where e.entity_type = 'school'
    order by e.id
    limit p_limit
    offset p_offset
  ),

  -- Pick ONE geometry per district (boundary only)
  district_geoms as materialized (
    select distinct on (d.id)
      d.id as district_id,
      dg.geom as district_geom,
      st_area(dg.geom::geography) as district_area_geog
    from public.entities d
    join public.entity_geometries dg
      on dg.entity_id = d.id
     and dg.geometry_type = 'boundary'
    where d.entity_type = 'district'
    order by d.id
  ),

  district_candidates as (
    select
      sb.school_id,
      dg.district_id,
      dg.district_area_geog
    from school_batch sb
    join district_geoms dg
      on (dg.district_geom && sb.school_geom) -- fast bbox prefilter
     and st_covers(dg.district_geom, sb.school_geom) -- exact test
  ),

  best_district as (
    select distinct on (school_id)
      school_id,
      district_id
    from district_candidates
    order by
      school_id,
      district_area_geog asc
  ),

  upsert_primary as (
    insert into public.entity_relationships (
      parent_entity_id,
      child_entity_id,
      relationship_type,
      is_primary
    )
    select
      bd.district_id,
      bd.school_id,
      'contains',
      true
    from best_district bd
    on conflict (child_entity_id, relationship_type) where is_primary
    do update
      set parent_entity_id = excluded.parent_entity_id,
          is_primary = true
    returning 1
  ),

  mn_state as materialized (
    select s.id as state_id, sg.geom as state_geom
    from public.entities s
    join public.entity_geometries sg
      on sg.entity_id = s.id
     and sg.geometry_type = 'boundary'
    where s.entity_type = 'state'
      and s.slug = 'mn'
    limit 1
  ),

  inserted_state as (
    insert into public.entity_relationships (
      parent_entity_id,
      child_entity_id,
      relationship_type,
      is_primary
    )
    select
      ms.state_id,
      sb.school_id,
      'contains',
      false
    from mn_state ms
    join school_batch sb
      on (ms.state_geom && sb.school_geom) -- bbox prefilter
     and st_covers(ms.state_geom, sb.school_geom)
    on conflict (parent_entity_id, child_entity_id, relationship_type)
    do nothing
    returning 1
  )

  select
    (select count(*) from upsert_primary),
    (select count(*) from inserted_state)
  into v_rows_primary, v_rows_state;

  return jsonb_build_object(
    'limit', p_limit,
    'offset', p_offset,
    'primary_upserts', v_rows_primary,
    'mn_state_inserts', v_rows_state
  );
end;
$$;


ALTER FUNCTION "public"."link_schools_to_districts"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_document_version_approved"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  -- Only act on a transition to approved.
  if old.status is distinct from new.status
     and new.status = 'approved'::public.document_version_status then

    if new.approved_at is null then
      new.approved_at := now();
    end if;

    if new.approved_by is null then
      new.approved_by := auth.uid();
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."on_document_version_approved"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_geom_from_geojson_4326"("p_geojson" "jsonb") RETURNS geometry
    LANGUAGE "plpgsql" STABLE
    AS $$
begin
  begin
    return public._geom_from_geojson_4326(p_geojson);
  exception when others then
    return null;
  end;
end;
$$;


ALTER FUNCTION "public"."safe_geom_from_geojson_4326"("p_geojson" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_document_version_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_next integer;
begin
  -- If caller provided one explicitly, keep it.
  if new.version_number is not null then
    return new;
  end if;

  select coalesce(max(dv.version_number), 0) + 1
    into v_next
  from public.document_versions dv
  where dv.document_id = new.document_id;

  new.version_number := v_next;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_document_version_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_entity_geometry_from_geojson"("p_entity_id" "uuid", "p_geojson" "jsonb", "p_geometry_type" "text", "p_source" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'extensions', 'public'
    AS $$
declare
  v_geom "extensions"."geometry";
begin
  if p_entity_id is null then
    raise exception 'p_entity_id is required';
  end if;
  if p_geojson is null then
    raise exception 'p_geojson is required';
  end if;
  if p_geometry_type is null or length(trim(p_geometry_type)) = 0 then
    raise exception 'p_geometry_type is required';
  end if;

  v_geom := public._geom_from_geojson_4326(p_geojson);

  -- Upsert primary geometry
  insert into public.entity_geometries (
    entity_id,
    geometry_type,
    source,
    geom,
    geojson,
    updated_at
  )
  values (
    p_entity_id,
    p_geometry_type,
    p_source,
    v_geom,
    p_geojson,
    now()
  )
  on conflict (entity_id, geometry_type)
  do update set
    source    = excluded.source,
    geom      = excluded.geom,
    geojson   = excluded.geojson,
    updated_at = now();

end;
$$;


ALTER FUNCTION "public"."upsert_entity_geometry_from_geojson"("p_entity_id" "uuid", "p_geojson" "jsonb", "p_geometry_type" "text", "p_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_entity_geometry_from_geojson"("p_entity_id" "uuid", "p_geojson" "jsonb", "p_geometry_type" "text", "p_simplified_type" "text" DEFAULT NULL::"text", "p_simplify" boolean DEFAULT false, "p_source" "text" DEFAULT NULL::"text", "p_tolerance" double precision DEFAULT 0.0001) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'extensions', 'public'
    AS $$
declare
  v_geom "extensions"."geometry";
  v_bbox "extensions"."geometry";
  v_centroid "extensions"."geometry";

  v_simplified "extensions"."geometry";
  v_s_bbox "extensions"."geometry";
  v_s_centroid "extensions"."geometry";
begin
  if p_entity_id is null then
    raise exception 'p_entity_id is required';
  end if;
  if p_geojson is null then
    raise exception 'p_geojson is required';
  end if;
  if p_geometry_type is null or length(trim(p_geometry_type)) = 0 then
    raise exception 'p_geometry_type is required';
  end if;

  -- Convert GeoJSON -> PostGIS geometry (SRID 4326)
  v_geom := public._geom_from_geojson_4326(p_geojson);

  -- Derivatives
  v_bbox := st_envelope(v_geom);
  v_centroid := st_pointonsurface(v_geom);

  -- Upsert primary geometry row (canonical)
  insert into public.entity_geometries (
    entity_id,
    geometry_type,
    source,
    geom,
    geojson,
    bbox,
    centroid,
    created_at,
    updated_at
  )
  values (
    p_entity_id,
    p_geometry_type,
    p_source,
    v_geom,
    p_geojson,
    v_bbox,
    v_centroid,
    now(),
    now()
  )
  on conflict (entity_id, geometry_type)
  do update set
    source     = excluded.source,
    geom       = excluded.geom,
    geojson    = excluded.geojson,
    bbox       = excluded.bbox,
    centroid   = excluded.centroid,
    updated_at = now();

  -- Optional simplified geometry record
  if coalesce(p_simplify, false) is true then
    if p_simplified_type is null or length(trim(p_simplified_type)) = 0 then
      raise exception 'p_simplified_type is required when p_simplify = true';
    end if;

    begin
      v_simplified := st_simplifypreservetopology(v_geom, p_tolerance);
    exception when others then
      v_simplified := st_simplify(v_geom, p_tolerance);
    end;

    v_s_bbox := st_envelope(v_simplified);
    v_s_centroid := st_pointonsurface(v_simplified);

    insert into public.entity_geometries (
      entity_id,
      geometry_type,
      source,
      geom,
      geojson,
      bbox,
      centroid,
      created_at,
      updated_at
    )
    values (
      p_entity_id,
      p_simplified_type,
      p_source,
      v_simplified,
      st_asgeojson(v_simplified, 9, 8)::jsonb,
      v_s_bbox,
      v_s_centroid,
      now(),
      now()
    )
    on conflict (entity_id, geometry_type)
    do update set
      source     = excluded.source,
      geom       = excluded.geom,
      geojson    = excluded.geojson,
      bbox       = excluded.bbox,
      centroid   = excluded.centroid,
      updated_at = now();
  end if;
end;
$$;


ALTER FUNCTION "public"."upsert_entity_geometry_from_geojson"("p_entity_id" "uuid", "p_geojson" "jsonb", "p_geometry_type" "text", "p_simplified_type" "text", "p_simplify" boolean, "p_source" "text", "p_tolerance" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_entity_geometry_with_geom_geojson"("p_entity_id" "uuid", "p_geometry_type" "text", "p_geojson" "jsonb", "p_geom_geojson" "jsonb", "p_bbox" "jsonb", "p_source" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'extensions', 'public'
    AS $$
declare
  v_geom "extensions"."geometry";
  v_bbox "extensions"."geometry";
begin
  if p_entity_id is null then
    raise exception 'p_entity_id is required';
  end if;

  if p_geometry_type is null or length(trim(p_geometry_type)) = 0 then
    raise exception 'p_geometry_type is required';
  end if;

  if p_geom_geojson is null then
    raise exception 'p_geom_geojson is required (GeoJSON Geometry object)';
  end if;

  -- Convert GeoJSON Geometry -> PostGIS geometry
  v_geom := ST_SetSRID(ST_GeomFromGeoJSON(p_geom_geojson::text), 4326);

  if v_geom is null then
      v_geom := extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(p_geom_geojson::text), 4326);
  end if;

  -- Compute bbox geometry (envelope)
    v_bbox := extensions.ST_Envelope(v_geom);

  -- Upsert into entity_geometries
  insert into public.entity_geometries (
    entity_id,
    geometry_type,
    geom,
    geojson,
    source,
    bbox,
    updated_at
  )
  values (
    p_entity_id,
    p_geometry_type,
    v_geom,
    p_geojson,
    p_source,
    v_bbox,
    now()
  )
  on conflict (entity_id, geometry_type)
  do update set
    geom = excluded.geom,
    geojson = excluded.geojson,
    source = excluded.source,
    bbox = excluded.bbox,
    updated_at = now();

end;
$$;


ALTER FUNCTION "public"."upsert_entity_geometry_with_geom_geojson"("p_entity_id" "uuid", "p_geometry_type" "text", "p_geojson" "jsonb", "p_geom_geojson" "jsonb", "p_bbox" "jsonb", "p_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_profiles_and_roles"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  -- Upsert into profiles
  insert into public.profiles (
    id, full_name, first_name, last_name, username, website, avatar_url, updated_at, role
  )
  values (
    new.id,
    new.full_name,
    new.first_name,
    new.last_name,
    new.username,
    new.website,
    new.avatar_url,
    coalesce(new.updated_at, now()),
    new.role
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    first_name = excluded.first_name,
    last_name  = excluded.last_name,
    username   = excluded.username,
    website    = excluded.website,
    avatar_url = excluded.avatar_url,
    updated_at = excluded.updated_at,
    role = excluded.role;

  -- Upsert into user_roles
  -- if new.role is not null then
  --   insert into public.user_roles (user_id, role)
  --   values (new.id, new.role)
  --   on conflict (id) do update
  --     set role = excluded.role;
  -- end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."upsert_profiles_and_roles"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "branding"."asset_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "asset_kind" "text" DEFAULT 'image'::"text" NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "branding"."asset_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "branding"."asset_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "subcategory_id" "uuid",
    "label_override" "text",
    "help_text" "text",
    "sort_order" integer DEFAULT 100 NOT NULL,
    "is_required" boolean DEFAULT false NOT NULL,
    "max_assets" integer DEFAULT 1 NOT NULL,
    "allowed_mime_types" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "branding"."asset_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "branding"."asset_subcategories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 100 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "branding"."asset_subcategories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "branding"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "subcategory_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "bucket" "text" DEFAULT 'branding-assets'::"text" NOT NULL,
    "path" "text" NOT NULL,
    "mime_type" "text",
    "size_bytes" bigint,
    "width_px" integer,
    "height_px" integer,
    "is_retired" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "branding"."assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "branding"."palette_colors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "palette_id" "uuid" NOT NULL,
    "slot" integer NOT NULL,
    "hex" "text" NOT NULL,
    "label" "text",
    "usage_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "palette_colors_hex_format_check" CHECK (("hex" ~* '^#[0-9a-f]{6}$'::"text"))
);


ALTER TABLE "branding"."palette_colors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "branding"."palettes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "role" "branding"."color_role" NOT NULL,
    "name" "text" NOT NULL,
    "usage_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "branding"."palettes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "branding"."patterns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pattern_type" "branding"."pattern_type" NOT NULL,
    "allowed_colors" "text"[],
    "file_png" "text",
    "file_svg" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entity_id" "uuid" NOT NULL
);


ALTER TABLE "branding"."patterns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "branding"."typography" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "font_name" "text" NOT NULL,
    "weights" "jsonb",
    "download_url" "text",
    "usage_rules" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "availability" "text",
    "role" "branding"."typography_role" DEFAULT 'body'::"branding"."typography_role" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    CONSTRAINT "typography_availability_check" CHECK (("availability" = ANY (ARRAY['system'::"text", 'google'::"text", 'licensed'::"text"])))
);


ALTER TABLE "branding"."typography" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "governance"."approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "target_type" "governance"."approval_target_type" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "board_member_id" "uuid" NOT NULL,
    "approval_method" "text" DEFAULT 'clickwrap'::"text" NOT NULL,
    "signature_hash" "text" NOT NULL,
    "ip_address" "inet",
    "approved_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "governance"."approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "governance"."board_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "board_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "term_start" "date",
    "term_end" "date",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "governance"."board_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "governance"."boards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid",
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "governance"."boards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "governance"."meeting_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meeting_id" "uuid" NOT NULL,
    "board_member_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    CONSTRAINT "meeting_attendance_status_check" CHECK (("status" = ANY (ARRAY['present'::"text", 'absent'::"text", 'excused'::"text"])))
);


ALTER TABLE "governance"."meeting_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "governance"."meeting_minutes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meeting_id" "uuid" NOT NULL,
    "content" "text",
    "draft" boolean,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "governance"."minutes_status" DEFAULT 'draft'::"governance"."minutes_status" NOT NULL,
    "content_json" "jsonb",
    "content_md" "text",
    "finalized_at" timestamp with time zone,
    "finalized_by" "uuid",
    "locked_at" timestamp with time zone,
    "amended_from_id" "uuid",
    "version_number" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "governance"."meeting_minutes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "governance"."meeting_minutes_expanded" AS
 SELECT "mm"."id",
    "mm"."meeting_id",
    "mm"."content",
    "mm"."draft",
    "mm"."created_at",
    "mm"."status",
    "mm"."content_json",
    "mm"."content_md",
    "mm"."finalized_at",
    "mm"."finalized_by",
    "mm"."locked_at",
    "mm"."amended_from_id",
    "mm"."version_number",
    "bm"."board_id",
    "bm"."scheduled_start",
    "bm"."scheduled_end",
    "bm"."meeting_type",
    "bm"."title" AS "meeting_title",
    "bm"."status" AS "meeting_status"
   FROM ("governance"."meeting_minutes" "mm"
     JOIN "governance"."board_meetings" "bm" ON (("bm"."id" = "mm"."meeting_id")));


ALTER TABLE "governance"."meeting_minutes_expanded" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "governance"."motions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meeting_id" "uuid" NOT NULL,
    "title" "text",
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "governance"."motions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "governance"."votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "motion_id" "uuid" NOT NULL,
    "board_member_id" "uuid",
    "user_id" "uuid",
    "vote" "text",
    "vote_value" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "governance"."votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "irs"."entity_links" (
    "ein" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "match_type" "text" DEFAULT 'manual'::"text" NOT NULL,
    "confidence" numeric,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "irs"."entity_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "irs"."returns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ein" "text" NOT NULL,
    "return_type" "irs"."irs_return_type" DEFAULT 'unknown'::"irs"."irs_return_type" NOT NULL,
    "tax_year" integer NOT NULL,
    "tax_period_start" "date",
    "tax_period_end" "date",
    "filed_on" "date",
    "irs_object_id" "text",
    "source_system" "text" DEFAULT 'irs'::"text" NOT NULL,
    "is_amended" boolean,
    "is_terminated" boolean,
    "principal_officer_name" "text",
    "gross_receipts_cap" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "return_name" "text",
    CONSTRAINT "returns_tax_period_chk" CHECK ((("tax_period_start" IS NULL) OR ("tax_period_end" IS NULL) OR ("tax_period_end" >= "tax_period_start"))),
    CONSTRAINT "returns_tax_year_check" CHECK ((("tax_year" >= 1900) AND ("tax_year" <= 2100)))
);


ALTER TABLE "irs"."returns" OWNER TO "postgres";


CREATE OR REPLACE VIEW "irs"."latest_returns" AS
 SELECT DISTINCT ON ("r"."ein", "r"."return_type") "r"."id",
    "r"."ein",
    "r"."return_type",
    "r"."tax_year",
    "r"."tax_period_start",
    "r"."tax_period_end",
    "r"."filed_on",
    "r"."irs_object_id",
    "r"."source_system",
    "r"."is_amended",
    "r"."is_terminated",
    "r"."principal_officer_name",
    "r"."gross_receipts_cap",
    "r"."created_at",
    "r"."updated_at"
   FROM "irs"."returns" "r"
  ORDER BY "r"."ein", "r"."return_type", "r"."tax_year" DESC;


ALTER TABLE "irs"."latest_returns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "irs"."return_financials" (
    "return_id" "uuid" NOT NULL,
    "total_revenue" numeric,
    "total_expenses" numeric,
    "excess_or_deficit" numeric,
    "total_assets_begin" numeric,
    "total_assets_end" numeric,
    "total_liabilities_begin" numeric,
    "total_liabilities_end" numeric,
    "net_assets_begin" numeric,
    "net_assets_end" numeric,
    "contributions" numeric,
    "program_service_revenue" numeric,
    "investment_income" numeric,
    "fundraising_gross" numeric,
    "program_expenses" numeric,
    "management_general_expenses" numeric,
    "fundraising_expenses" numeric,
    "source_map" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "return_financials_net_assets_chk" CHECK ((("net_assets_end" IS NULL) OR ("total_assets_end" IS NULL) OR ("total_liabilities_end" IS NULL) OR ("net_assets_end" = ("total_assets_end" - "total_liabilities_end"))))
);


ALTER TABLE "irs"."return_financials" OWNER TO "postgres";


CREATE OR REPLACE VIEW "irs"."latest_financials" AS
 SELECT "lr"."ein",
    "lr"."return_type",
    "lr"."tax_year",
    "f"."return_id",
    "f"."total_revenue",
    "f"."total_expenses",
    "f"."excess_or_deficit",
    "f"."total_assets_begin",
    "f"."total_assets_end",
    "f"."total_liabilities_begin",
    "f"."total_liabilities_end",
    "f"."net_assets_begin",
    "f"."net_assets_end",
    "f"."contributions",
    "f"."program_service_revenue",
    "f"."investment_income",
    "f"."fundraising_gross",
    "f"."program_expenses",
    "f"."management_general_expenses",
    "f"."fundraising_expenses",
    "f"."source_map",
    "f"."created_at",
    "f"."updated_at"
   FROM ("irs"."latest_returns" "lr"
     JOIN "irs"."return_financials" "f" ON (("f"."return_id" = "lr"."id")));


ALTER TABLE "irs"."latest_financials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "irs"."organizations" (
    "ein" "text" NOT NULL,
    "ein_normalized" "text" GENERATED ALWAYS AS ("regexp_replace"("ein", '-'::"text", ''::"text", 'g'::"text")) STORED,
    "legal_name" "text" NOT NULL,
    "normalized_legal_name" "text",
    "aka_names" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "city" "text",
    "state" "text",
    "country" "text" DEFAULT 'US'::"text" NOT NULL,
    "website" "text",
    "subsection_code" "text",
    "foundation_code" "text",
    "ruling_year" integer,
    "deductibility_code" "text",
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organizations_ein_check" CHECK (("ein" ~ '^[0-9]{2}-?[0-9]{7}$'::"text"))
);


ALTER TABLE "irs"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "irs"."return_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "return_id" "uuid" NOT NULL,
    "doc_type" "irs"."irs_doc_type" NOT NULL,
    "storage_bucket" "text",
    "storage_path" "text",
    "sha256" "text",
    "mime_type" "text",
    "bytes" integer,
    "fetched_from" "text",
    "fetched_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "irs"."return_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "irs"."return_narratives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "return_id" "uuid" NOT NULL,
    "section" "irs"."irs_narrative_section" NOT NULL,
    "label" "text",
    "raw_text" "text" NOT NULL,
    "extracted" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ai_summary" "text",
    "source_map" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "irs"."return_narratives" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "irs"."return_people" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "return_id" "uuid" NOT NULL,
    "role" "irs"."irs_person_role" NOT NULL,
    "name" "text" NOT NULL,
    "title" "text",
    "average_hours_per_week" numeric,
    "reportable_compensation" numeric,
    "other_compensation" numeric,
    "is_current" boolean DEFAULT true,
    "source_map" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "irs"."return_people" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "irs"."return_restrictions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "return_id" "uuid" NOT NULL,
    "restriction_type" "irs"."irs_restriction_type" NOT NULL,
    "summary" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "confidence" numeric,
    "source_narrative_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "irs"."return_restrictions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."businesses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "place_id" "text",
    "name" "text" NOT NULL,
    "address" "text",
    "lat" double precision,
    "lng" double precision,
    "phone_number" "text",
    "website" "text",
    "types" "text"[],
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entity_id" "uuid" NOT NULL,
    CONSTRAINT "businesses_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."businesses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."district_metadata" (
    "entity_id" "uuid" NOT NULL,
    "sdorgid" "text",
    "formid" "text",
    "sdnumber" "text",
    "sdtype" "text",
    "prefname" "text",
    "shortname" "text",
    "web_url" "text",
    "acres" numeric,
    "sqmiles" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."district_metadata" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "version_number" integer,
    "status" "public"."document_version_status" DEFAULT 'draft'::"public"."document_version_status" NOT NULL,
    "content_md" "text",
    "storage_bucket" "text",
    "storage_path" "text",
    "mime_type" "text",
    "file_sha256" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "approved_by_meeting_id" "uuid",
    "review_notes" "text"
);


ALTER TABLE "public"."document_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "document_type" "public"."document_type" NOT NULL,
    "title" "text" NOT NULL,
    "visibility" "public"."document_visibility" DEFAULT 'internal'::"public"."document_visibility" NOT NULL,
    "status" "public"."document_status" DEFAULT 'active'::"public"."document_status" NOT NULL,
    "current_version_id" "uuid",
    "effective_start" "date",
    "effective_end" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tax_year" integer
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."donations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "amount" integer NOT NULL,
    "stripe_session_id" "text" NOT NULL,
    "subscription_id" "text",
    "type" "public"."donation_type" DEFAULT 'platform'::"public"."donation_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "invoice_id" "text",
    "receipt_url" "text",
    "user_id" "uuid",
    "entity_id" "uuid"
);


ALTER TABLE "public"."donations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "external_ids" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."entities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_attributes" (
    "entity_id" "uuid" NOT NULL,
    "namespace" "text" NOT NULL,
    "attrs" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."entity_attributes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "contact_role" "text" NOT NULL,
    "name" "text",
    "email" "text",
    "phone" "text",
    "source_system" "text" NOT NULL,
    "source_formid" "text" NOT NULL,
    "source_url" "text" NOT NULL,
    "is_current" boolean DEFAULT true NOT NULL,
    "first_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "raw" "jsonb"
);


ALTER TABLE "public"."entity_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_field_overrides" (
    "entity_id" "uuid" NOT NULL,
    "namespace" "text" NOT NULL,
    "field_key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "confidence" integer DEFAULT 100 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."entity_field_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_geometries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "geometry_type" "text" NOT NULL,
    "source" "text",
    "centroid" "extensions"."geometry",
    "bbox" "extensions"."geometry",
    "geojson" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "geom" "extensions"."geometry",
    CONSTRAINT "entity_geometries_geom_type_check" CHECK (("geometry_type" = ANY (ARRAY['boundary'::"text", 'boundary_simplified'::"text", 'point'::"text", 'service_area'::"text", 'district_attendance_areas'::"text", 'school_program_locations'::"text"])))
);


ALTER TABLE "public"."entity_geometries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_onboarding_progress" (
    "entity_id" "uuid" NOT NULL,
    "section" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "last_updated" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."entity_onboarding_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_person_claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "source" "text" DEFAULT 'irs'::"text" NOT NULL,
    "source_person_id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."entity_person_claims" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_entity_id" "uuid" NOT NULL,
    "child_entity_id" "uuid" NOT NULL,
    "relationship_type" "text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "entity_relationships_not_self" CHECK (("parent_entity_id" <> "child_entity_id"))
);


ALTER TABLE "public"."entity_relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_source_records" (
    "entity_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "external_key" "text",
    "payload" "jsonb" NOT NULL,
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."entity_source_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_status" (
    "entity_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "entity_status_valid" CHECK (("status" = ANY (ARRAY['unregistered'::"text", 'pending'::"text", 'signed'::"text", 'active'::"text"])))
);


ALTER TABLE "public"."entity_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_types" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."entity_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."entity_types" IS 'Reference list of entities managed by the platform (districts, nonprofits, businesses, etc.)';



COMMENT ON COLUMN "public"."entity_types"."key" IS 'Stable identifier (e.g., district, nonprofit, business)';



COMMENT ON COLUMN "public"."entity_types"."active" IS 'Soft-enable flag for feature rollout';



CREATE TABLE IF NOT EXISTS "public"."entity_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."entity_user_role" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    CONSTRAINT "entity_users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'invited'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."entity_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mde_org_types" (
    "code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mde_org_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mde_school_class_types" (
    "code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "short_description" "text",
    "program_school" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mde_school_class_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mde_states" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "fips_code" integer,
    "country" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mde_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" bigint NOT NULL,
    "inserted_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "message" "text",
    "user_id" "uuid" NOT NULL,
    "channel_id" bigint NOT NULL
);

ALTER TABLE ONLY "public"."messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."messages" IS 'Individual messages sent by each user.';



ALTER TABLE "public"."messages" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."messages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."nonprofits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "ein" "text",
    "org_type" "public"."org_type" NOT NULL,
    "mission_statement" "text",
    "website_url" "text",
    "logo_url" "text",
    "address" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."nonprofits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "website" "text",
    "first_name" "text",
    "last_name" "text",
    "role" "text",
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User Profiles';



CREATE TABLE IF NOT EXISTS "public"."school_program_location_metadata" (
    "entity_id" "uuid" NOT NULL,
    "orgid" "text",
    "formid" "text",
    "orgnumber" "text",
    "orgtype" "text",
    "schnumber" "text",
    "countycode" "text",
    "graderange" "text",
    "loctype" "text",
    "magnet" "text",
    "pubpriv" "text",
    "locdistid" "text",
    "locdistname" "text",
    "mdeaddr" "text",
    "mdename" "text",
    "web_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."school_program_location_metadata" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "stripe_subscription_id" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "entity_id" "uuid"
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."superintendent_scope_nonprofits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "district_entity_id" "uuid" NOT NULL,
    "ein" "text" NOT NULL,
    "label" "text",
    "tier" "text" DEFAULT 'registry_only'::"text" NOT NULL,
    "status" "text" DEFAULT 'candidate'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "entity_id" "uuid",
    CONSTRAINT "superintendent_scope_nonprofits_status_check" CHECK (("status" = ANY (ARRAY['candidate'::"text", 'active'::"text", 'archived'::"text"]))),
    CONSTRAINT "superintendent_scope_nonprofits_tier_check" CHECK (("tier" = ANY (ARRAY['registry_only'::"text", 'disclosure_grade'::"text", 'institutional'::"text"])))
);


ALTER TABLE "public"."superintendent_scope_nonprofits" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."superintendent_scope_nonprofits_ready" AS
 SELECT "s"."id",
    "s"."district_entity_id",
    "s"."ein",
    "s"."label",
    "s"."tier",
    "s"."status",
    "s"."created_at",
    "s"."updated_at",
    "s"."entity_id",
    ("s"."entity_id" IS NOT NULL) AS "has_entity",
    (EXISTS ( SELECT 1
           FROM "irs"."entity_links" "l"
          WHERE ("l"."entity_id" = "s"."entity_id"))) AS "has_irs_link",
    (EXISTS ( SELECT 1
           FROM "irs"."latest_returns" "r"
          WHERE ("r"."ein" = "s"."ein"))) AS "has_returns",
    (("s"."entity_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "irs"."entity_links" "l"
          WHERE ("l"."entity_id" = "s"."entity_id"))) AND ("s"."status" = 'active'::"text")) AS "is_ready"
   FROM "public"."superintendent_scope_nonprofits" "s";


ALTER TABLE "public"."superintendent_scope_nonprofits_ready" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_profiles_with_roles" AS
 SELECT "p"."id",
    "p"."full_name",
    "p"."first_name",
    "p"."last_name",
    "p"."username",
    "p"."website",
    "p"."avatar_url",
    "p"."updated_at",
    "p"."role"
   FROM "public"."profiles" "p";


ALTER TABLE "public"."user_profiles_with_roles" OWNER TO "postgres";


ALTER TABLE ONLY "branding"."asset_categories"
    ADD CONSTRAINT "asset_categories_key_key" UNIQUE ("key");



ALTER TABLE ONLY "branding"."asset_categories"
    ADD CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "branding"."asset_slots"
    ADD CONSTRAINT "asset_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "branding"."asset_subcategories"
    ADD CONSTRAINT "asset_subcategories_category_id_key_key" UNIQUE ("category_id", "key");



ALTER TABLE ONLY "branding"."asset_subcategories"
    ADD CONSTRAINT "asset_subcategories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "branding"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "branding"."palettes"
    ADD CONSTRAINT "branding_palettes_entity_role_unique" UNIQUE ("entity_id", "role");



ALTER TABLE ONLY "branding"."palette_colors"
    ADD CONSTRAINT "palette_colors_palette_slot_unique" UNIQUE ("palette_id", "slot");



ALTER TABLE ONLY "branding"."palette_colors"
    ADD CONSTRAINT "palette_colors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "branding"."palettes"
    ADD CONSTRAINT "palettes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "branding"."patterns"
    ADD CONSTRAINT "patterns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "branding"."typography"
    ADD CONSTRAINT "typography_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "governance"."approvals"
    ADD CONSTRAINT "approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "governance"."board_meetings"
    ADD CONSTRAINT "board_meetings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "governance"."board_members"
    ADD CONSTRAINT "board_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "governance"."boards"
    ADD CONSTRAINT "boards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "governance"."meeting_attendance"
    ADD CONSTRAINT "meeting_attendance_meeting_id_board_member_id_key" UNIQUE ("meeting_id", "board_member_id");



ALTER TABLE ONLY "governance"."meeting_attendance"
    ADD CONSTRAINT "meeting_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "governance"."meeting_minutes"
    ADD CONSTRAINT "meeting_minutes_meeting_id_unique" UNIQUE ("meeting_id");



ALTER TABLE ONLY "governance"."meeting_minutes"
    ADD CONSTRAINT "meeting_minutes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "governance"."motions"
    ADD CONSTRAINT "motions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "governance"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "irs"."entity_links"
    ADD CONSTRAINT "entity_links_pkey" PRIMARY KEY ("ein");



ALTER TABLE ONLY "irs"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("ein");



ALTER TABLE ONLY "irs"."return_documents"
    ADD CONSTRAINT "return_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "irs"."return_financials"
    ADD CONSTRAINT "return_financials_pkey" PRIMARY KEY ("return_id");



ALTER TABLE ONLY "irs"."return_narratives"
    ADD CONSTRAINT "return_narratives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "irs"."return_people"
    ADD CONSTRAINT "return_people_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "irs"."return_restrictions"
    ADD CONSTRAINT "return_restrictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "irs"."returns"
    ADD CONSTRAINT "returns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "irs"."returns"
    ADD CONSTRAINT "returns_unique" UNIQUE ("ein", "return_type", "tax_year");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_place_id_key" UNIQUE ("place_id");



ALTER TABLE ONLY "public"."district_metadata"
    ADD CONSTRAINT "district_metadata_pkey" PRIMARY KEY ("entity_id");



ALTER TABLE ONLY "public"."document_versions"
    ADD CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_stripe_session_id_key" UNIQUE ("stripe_session_id");



ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entity_attributes"
    ADD CONSTRAINT "entity_attributes_pkey" PRIMARY KEY ("entity_id", "namespace");



ALTER TABLE ONLY "public"."entity_contacts"
    ADD CONSTRAINT "entity_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entity_field_overrides"
    ADD CONSTRAINT "entity_field_overrides_pkey" PRIMARY KEY ("entity_id", "namespace", "field_key");



ALTER TABLE ONLY "public"."entity_geometries"
    ADD CONSTRAINT "entity_geometries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entity_onboarding_progress"
    ADD CONSTRAINT "entity_onboarding_progress_pkey" PRIMARY KEY ("entity_id", "section");



ALTER TABLE ONLY "public"."entity_person_claims"
    ADD CONSTRAINT "entity_person_claims_entity_id_source_source_person_id_key" UNIQUE ("entity_id", "source", "source_person_id");



ALTER TABLE ONLY "public"."entity_person_claims"
    ADD CONSTRAINT "entity_person_claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entity_relationships"
    ADD CONSTRAINT "entity_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entity_source_records"
    ADD CONSTRAINT "entity_source_records_pkey" PRIMARY KEY ("entity_id", "source");



ALTER TABLE ONLY "public"."entity_status"
    ADD CONSTRAINT "entity_status_pkey" PRIMARY KEY ("entity_id");



ALTER TABLE ONLY "public"."entity_types"
    ADD CONSTRAINT "entity_types_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."entity_users"
    ADD CONSTRAINT "entity_users_entity_id_user_id_key" UNIQUE ("entity_id", "user_id");



ALTER TABLE ONLY "public"."entity_users"
    ADD CONSTRAINT "entity_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mde_org_types"
    ADD CONSTRAINT "mde_org_types_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."mde_school_class_types"
    ADD CONSTRAINT "mde_school_class_types_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."mde_states"
    ADD CONSTRAINT "mde_states_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nonprofits"
    ADD CONSTRAINT "nonprofits_ein_key" UNIQUE ("ein");



ALTER TABLE ONLY "public"."nonprofits"
    ADD CONSTRAINT "nonprofits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."school_program_location_metadata"
    ADD CONSTRAINT "school_program_location_metadata_pkey" PRIMARY KEY ("entity_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."superintendent_scope_nonprofits"
    ADD CONSTRAINT "superintendent_scope_nonprofits_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "asset_slots_entity_category_subcategory_uidx" ON "branding"."asset_slots" USING "btree" ("entity_type", "category_id", COALESCE("subcategory_id", '00000000-0000-0000-0000-000000000000'::"uuid"));



CREATE INDEX "asset_slots_entity_type_idx" ON "branding"."asset_slots" USING "btree" ("entity_type");



CREATE INDEX "asset_subcategories_category_id_idx" ON "branding"."asset_subcategories" USING "btree" ("category_id");



CREATE INDEX "assets_category_id_idx" ON "branding"."assets" USING "btree" ("category_id");



CREATE UNIQUE INDEX "assets_entity_category_subcategory_uidx" ON "branding"."assets" USING "btree" ("entity_id", "category_id", COALESCE("subcategory_id", '00000000-0000-0000-0000-000000000000'::"uuid")) WHERE ("is_retired" = false);



CREATE INDEX "assets_entity_id_idx" ON "branding"."assets" USING "btree" ("entity_id");



CREATE INDEX "assets_subcategory_id_idx" ON "branding"."assets" USING "btree" ("subcategory_id");



CREATE INDEX "palette_colors_palette_id_idx" ON "branding"."palette_colors" USING "btree" ("palette_id");



CREATE INDEX "palettes_entity_id_idx" ON "branding"."palettes" USING "btree" ("entity_id");



CREATE UNIQUE INDEX "patterns_entity_pattern_unique" ON "branding"."patterns" USING "btree" ("entity_id", "pattern_type");



CREATE INDEX "typography_entity_id_idx" ON "branding"."typography" USING "btree" ("entity_id");



CREATE UNIQUE INDEX "typography_entity_role_uidx" ON "branding"."typography" USING "btree" ("entity_id", "role");



CREATE INDEX "approvals_board_member_idx" ON "governance"."approvals" USING "btree" ("board_member_id");



CREATE INDEX "approvals_entity_idx" ON "governance"."approvals" USING "btree" ("entity_id");



CREATE INDEX "approvals_target_idx" ON "governance"."approvals" USING "btree" ("target_type", "target_id");



CREATE INDEX "board_meetings_board_id_idx" ON "governance"."board_meetings" USING "btree" ("board_id");



CREATE INDEX "board_members_board_id_idx" ON "governance"."board_members" USING "btree" ("board_id");



CREATE INDEX "board_members_user_id_idx" ON "governance"."board_members" USING "btree" ("user_id");



CREATE INDEX "boards_entity_id_idx" ON "governance"."boards" USING "btree" ("entity_id");



CREATE INDEX "meeting_attendance_board_member_id_idx" ON "governance"."meeting_attendance" USING "btree" ("board_member_id");



CREATE INDEX "meeting_attendance_meeting_id_idx" ON "governance"."meeting_attendance" USING "btree" ("meeting_id");



CREATE UNIQUE INDEX "meeting_minutes_meeting_id_idx" ON "governance"."meeting_minutes" USING "btree" ("meeting_id") WHERE ("draft" = false);



CREATE INDEX "motions_meeting_id_idx" ON "governance"."motions" USING "btree" ("meeting_id");



CREATE INDEX "votes_motion_id_idx" ON "governance"."votes" USING "btree" ("motion_id");



CREATE UNIQUE INDEX "entity_links_entity_id_ein_uidx" ON "irs"."entity_links" USING "btree" ("entity_id", "ein");



CREATE INDEX "irs_entity_links_entity_id_idx" ON "irs"."entity_links" USING "btree" ("entity_id");



CREATE INDEX "organizations_ein_normalized_idx" ON "irs"."organizations" USING "btree" ("ein_normalized");



CREATE INDEX "organizations_legal_name_trgm" ON "irs"."organizations" USING "gin" ("legal_name" "extensions"."gin_trgm_ops");



CREATE INDEX "organizations_state_city_idx" ON "irs"."organizations" USING "btree" ("state", "city");



CREATE INDEX "return_documents_return_id_idx" ON "irs"."return_documents" USING "btree" ("return_id");



CREATE UNIQUE INDEX "return_documents_unique_path_uidx" ON "irs"."return_documents" USING "btree" ("return_id", "doc_type", "storage_path") WHERE ("storage_path" IS NOT NULL);



CREATE INDEX "return_financials_net_assets_end_idx" ON "irs"."return_financials" USING "btree" ("net_assets_end" DESC);



CREATE INDEX "return_narratives_return_idx" ON "irs"."return_narratives" USING "btree" ("return_id");



CREATE INDEX "return_narratives_section_idx" ON "irs"."return_narratives" USING "btree" ("section");



CREATE INDEX "return_people_name_trgm" ON "irs"."return_people" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "return_people_return_idx" ON "irs"."return_people" USING "btree" ("return_id");



CREATE UNIQUE INDEX "return_people_unique_uidx" ON "irs"."return_people" USING "btree" ("return_id", "role", "name", COALESCE("title", ''::"text"));



CREATE INDEX "return_restrictions_return_idx" ON "irs"."return_restrictions" USING "btree" ("return_id");



CREATE INDEX "return_restrictions_type_idx" ON "irs"."return_restrictions" USING "btree" ("restriction_type");



CREATE INDEX "returns_ein_type_year_idx" ON "irs"."returns" USING "btree" ("ein", "return_type", "tax_year" DESC);



CREATE INDEX "returns_ein_year_idx" ON "irs"."returns" USING "btree" ("ein", "tax_year" DESC);



CREATE INDEX "returns_object_id_idx" ON "irs"."returns" USING "btree" ("irs_object_id");



CREATE INDEX "returns_return_name_trgm" ON "irs"."returns" USING "gin" ("return_name" "extensions"."gin_trgm_ops");



CREATE UNIQUE INDEX "businesses_entity_id_uidx" ON "public"."businesses" USING "btree" ("entity_id");



CREATE INDEX "district_metadata_sdorgid_idx" ON "public"."district_metadata" USING "btree" ("sdorgid");



CREATE INDEX "document_versions_doc_idx" ON "public"."document_versions" USING "btree" ("document_id");



CREATE UNIQUE INDEX "document_versions_doc_ver_uq" ON "public"."document_versions" USING "btree" ("document_id", "version_number");



CREATE INDEX "document_versions_status_idx" ON "public"."document_versions" USING "btree" ("document_id", "status");



CREATE INDEX "documents_entity_idx" ON "public"."documents" USING "btree" ("entity_id");



CREATE INDEX "documents_tax_year_idx" ON "public"."documents" USING "btree" ("tax_year");



CREATE INDEX "documents_type_idx" ON "public"."documents" USING "btree" ("entity_id", "document_type");



CREATE INDEX "donations_entity_id_idx" ON "public"."donations" USING "btree" ("entity_id");



CREATE INDEX "donations_invoice_id_idx" ON "public"."donations" USING "btree" ("invoice_id");



CREATE INDEX "donations_payment_intent_id_idx" ON "public"."donations" USING "btree" ("invoice_id");



CREATE INDEX "entities_attendance_area_sdorgid_idx" ON "public"."entities" USING "btree" ((("external_ids" ->> 'sdorgid'::"text"))) WHERE (("entity_type" = 'attendance_area'::"text") AND ("external_ids" ? 'sdorgid'::"text"));



CREATE INDEX "entities_district_sdorgid_idx" ON "public"."entities" USING "btree" ((("external_ids" ->> 'sdorgid'::"text"))) WHERE (("entity_type" = 'district'::"text") AND ("external_ids" ? 'sdorgid'::"text"));



CREATE UNIQUE INDEX "entities_entity_type_slug_key" ON "public"."entities" USING "btree" ("entity_type", "slug");



CREATE INDEX "entities_external_ids_gin" ON "public"."entities" USING "gin" ("external_ids");



CREATE INDEX "entities_school_mde_orgid_idx" ON "public"."entities" USING "btree" ((("external_ids" ->> 'mde_orgid'::"text"))) WHERE (("entity_type" = 'school'::"text") AND ("external_ids" ? 'mde_orgid'::"text"));



CREATE INDEX "entities_type_id_idx" ON "public"."entities" USING "btree" ("entity_type", "id");



CREATE INDEX "entities_type_idx" ON "public"."entities" USING "btree" ("entity_type");



CREATE INDEX "entity_attributes_attrs_gin" ON "public"."entity_attributes" USING "gin" ("attrs");



CREATE INDEX "entity_contacts_entity_role_current_idx" ON "public"."entity_contacts" USING "btree" ("entity_id", "contact_role", "is_current");



CREATE INDEX "entity_contacts_source_idx" ON "public"."entity_contacts" USING "btree" ("source_system", "source_formid");



CREATE UNIQUE INDEX "entity_contacts_source_role_email_uniq" ON "public"."entity_contacts" USING "btree" ("source_system", "source_formid", "contact_role", COALESCE("email", ''::"text"));



CREATE INDEX "entity_geometries_entity_geomtype_idx" ON "public"."entity_geometries" USING "btree" ("entity_id", "geometry_type");



CREATE UNIQUE INDEX "entity_geometries_entity_geomtype_uidx" ON "public"."entity_geometries" USING "btree" ("entity_id", "geometry_type");



CREATE INDEX "entity_geometries_entity_idx" ON "public"."entity_geometries" USING "btree" ("entity_id");



CREATE INDEX "entity_geometries_entity_type_idx" ON "public"."entity_geometries" USING "btree" ("entity_id", "geometry_type");



CREATE UNIQUE INDEX "entity_geometries_entity_type_uidx" ON "public"."entity_geometries" USING "btree" ("entity_id", "geometry_type");



CREATE INDEX "entity_geometries_geom_gix" ON "public"."entity_geometries" USING "gist" ("geom");



CREATE INDEX "entity_geometries_type_idx" ON "public"."entity_geometries" USING "btree" ("geometry_type");



CREATE INDEX "entity_person_claims_email_idx" ON "public"."entity_person_claims" USING "btree" ("email");



CREATE INDEX "entity_person_claims_entity_idx" ON "public"."entity_person_claims" USING "btree" ("entity_id");



CREATE INDEX "entity_relationships_child_idx" ON "public"."entity_relationships" USING "btree" ("child_entity_id");



CREATE INDEX "entity_relationships_child_type_primary_idx" ON "public"."entity_relationships" USING "btree" ("child_entity_id", "relationship_type", "is_primary");



CREATE INDEX "entity_relationships_contains_primary_idx" ON "public"."entity_relationships" USING "btree" ("parent_entity_id", "child_entity_id") WHERE (("relationship_type" = 'contains'::"text") AND ("is_primary" = true));



CREATE UNIQUE INDEX "entity_relationships_edge_uidx" ON "public"."entity_relationships" USING "btree" ("parent_entity_id", "child_entity_id", "relationship_type");



CREATE INDEX "entity_relationships_parent_idx" ON "public"."entity_relationships" USING "btree" ("parent_entity_id");



CREATE INDEX "entity_relationships_parent_rel_child_idx" ON "public"."entity_relationships" USING "btree" ("parent_entity_id", "relationship_type", "child_entity_id");



CREATE INDEX "entity_relationships_parent_type_primary_idx" ON "public"."entity_relationships" USING "btree" ("parent_entity_id", "relationship_type", "is_primary");



CREATE UNIQUE INDEX "entity_relationships_primary_uidx" ON "public"."entity_relationships" USING "btree" ("child_entity_id", "relationship_type") WHERE "is_primary";



CREATE INDEX "entity_relationships_type_idx" ON "public"."entity_relationships" USING "btree" ("relationship_type");



CREATE INDEX "entity_source_records_external_key_idx" ON "public"."entity_source_records" USING "btree" ("external_key");



CREATE INDEX "entity_source_records_payload_gin" ON "public"."entity_source_records" USING "gin" ("payload");



CREATE INDEX "entity_source_records_source_idx" ON "public"."entity_source_records" USING "btree" ("source");



CREATE INDEX "entity_users_entity_id_idx" ON "public"."entity_users" USING "btree" ("entity_id");



CREATE INDEX "entity_users_user_id_idx" ON "public"."entity_users" USING "btree" ("user_id");



CREATE INDEX "idx_entity_field_overrides_entity" ON "public"."entity_field_overrides" USING "btree" ("entity_id");



CREATE INDEX "idx_entity_geometries_entity_type" ON "public"."entity_geometries" USING "btree" ("entity_id", "geometry_type");



CREATE INDEX "idx_entity_onboarding_progress_entity" ON "public"."entity_onboarding_progress" USING "btree" ("entity_id");



CREATE INDEX "idx_scope_nps_district_status" ON "public"."superintendent_scope_nonprofits" USING "btree" ("district_entity_id", "status");



CREATE INDEX "idx_scope_nps_entity" ON "public"."superintendent_scope_nonprofits" USING "btree" ("entity_id");



CREATE INDEX "nonprofits_active_idx" ON "public"."nonprofits" USING "btree" ("active");



CREATE UNIQUE INDEX "nonprofits_entity_id_uidx" ON "public"."nonprofits" USING "btree" ("entity_id");



CREATE INDEX "nonprofits_org_type_idx" ON "public"."nonprofits" USING "btree" ("org_type");



CREATE INDEX "school_program_location_metadata_locdistid_idx" ON "public"."school_program_location_metadata" USING "btree" ("locdistid");



CREATE INDEX "school_program_location_metadata_orgid_idx" ON "public"."school_program_location_metadata" USING "btree" ("orgid");



CREATE INDEX "subscriptions_entity_id_idx" ON "public"."subscriptions" USING "btree" ("entity_id");



CREATE INDEX "superintendent_scope_nonprofits_ein_idx" ON "public"."superintendent_scope_nonprofits" USING "btree" ("ein");



-- 2) Add the future-proof unique index you actually want
create unique index if not exists superintendent_scope_nonprofits_district_ein_uidx
  on public.superintendent_scope_nonprofits using btree (district_entity_id, ein)
  tablespace pg_default;

CREATE INDEX "superintendent_scope_nonprofits_status_idx" ON "public"."superintendent_scope_nonprofits" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "trg_asset_categories_updated_at" BEFORE UPDATE ON "branding"."asset_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_asset_slots_updated_at" BEFORE UPDATE ON "branding"."asset_slots" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_asset_subcategories_updated_at" BEFORE UPDATE ON "branding"."asset_subcategories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_assets_updated_at" BEFORE UPDATE ON "branding"."assets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_palette_colors_updated_at" BEFORE UPDATE ON "branding"."palette_colors" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_palettes_updated_at" BEFORE UPDATE ON "branding"."palettes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_patterns_updated_at" BEFORE UPDATE ON "branding"."patterns" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_touch_branding_palettes" BEFORE UPDATE ON "branding"."palettes" FOR EACH ROW EXECUTE FUNCTION "branding"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_touch_palette_colors" BEFORE UPDATE ON "branding"."palette_colors" FOR EACH ROW EXECUTE FUNCTION "branding"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_typography_updated_at" BEFORE UPDATE ON "branding"."typography" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "board_meetings_enforce_lifecycle" BEFORE INSERT OR UPDATE ON "governance"."board_meetings" FOR EACH ROW EXECUTE FUNCTION "governance"."trg_board_meetings_enforce_lifecycle"();



CREATE OR REPLACE TRIGGER "minutes_auto_version" BEFORE INSERT ON "governance"."meeting_minutes" FOR EACH ROW EXECUTE FUNCTION "governance"."trg_minutes_auto_version"();



CREATE OR REPLACE TRIGGER "minutes_immutable_if_finalized" BEFORE INSERT OR UPDATE ON "governance"."meeting_minutes" FOR EACH ROW EXECUTE FUNCTION "governance"."trg_minutes_immutable_if_finalized"();



CREATE OR REPLACE TRIGGER "no_minutes_updates_after_approval" BEFORE DELETE OR UPDATE ON "governance"."meeting_minutes" FOR EACH ROW EXECUTE FUNCTION "governance"."prevent_minutes_updates_after_approval"();



CREATE OR REPLACE TRIGGER "no_motion_updates_after_finalize" BEFORE DELETE OR UPDATE ON "governance"."motions" FOR EACH ROW EXECUTE FUNCTION "governance"."prevent_motion_updates_after_finalize"();



CREATE OR REPLACE TRIGGER "no_vote_updates_after_finalize" BEFORE DELETE OR UPDATE ON "governance"."votes" FOR EACH ROW EXECUTE FUNCTION "governance"."prevent_vote_updates"();



CREATE OR REPLACE TRIGGER "trg_prevent_minutes_update_when_locked" BEFORE DELETE OR UPDATE ON "governance"."meeting_minutes" FOR EACH ROW EXECUTE FUNCTION "governance"."prevent_minutes_update_when_locked"();



CREATE OR REPLACE TRIGGER "votes_block_after_adjournment" BEFORE INSERT OR DELETE OR UPDATE ON "governance"."votes" FOR EACH ROW EXECUTE FUNCTION "governance"."trg_votes_block_after_adjournment"();



CREATE OR REPLACE TRIGGER "votes_enforce_open" BEFORE INSERT OR UPDATE ON "governance"."votes" FOR EACH ROW EXECUTE FUNCTION "governance"."enforce_votes_open"();



CREATE OR REPLACE TRIGGER "trg_irs_organizations_updated_at" BEFORE UPDATE ON "irs"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_irs_return_financials_updated_at" BEFORE UPDATE ON "irs"."return_financials" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_irs_returns_updated_at" BEFORE UPDATE ON "irs"."returns" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_businesses_updated_at" BEFORE UPDATE ON "public"."businesses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_document_versions_updated_at" BEFORE UPDATE ON "public"."document_versions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_nonprofits_updated_at" BEFORE UPDATE ON "public"."nonprofits" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_entities_updated_at" BEFORE UPDATE ON "public"."entities" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_entity_attributes_updated_at" BEFORE UPDATE ON "public"."entity_attributes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_entity_geometries_updated_at" BEFORE UPDATE ON "public"."entity_geometries" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_entity_relationships_updated_at" BEFORE UPDATE ON "public"."entity_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_entity_status_updated_at" BEFORE UPDATE ON "public"."entity_status" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_mde_org_types_updated_at" BEFORE UPDATE ON "public"."mde_org_types" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_mde_school_class_types_updated_at" BEFORE UPDATE ON "public"."mde_school_class_types" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_mde_states_updated_at" BEFORE UPDATE ON "public"."mde_states" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_on_document_version_approved" BEFORE UPDATE OF "status" ON "public"."document_versions" FOR EACH ROW EXECUTE FUNCTION "public"."on_document_version_approved"();



CREATE OR REPLACE TRIGGER "trg_scope_nonprofit_autocreate_entity" BEFORE INSERT OR UPDATE OF "entity_id", "ein", "label" ON "public"."superintendent_scope_nonprofits" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_scope_nonprofit_entity"();



CREATE OR REPLACE TRIGGER "trg_set_document_version_number" BEFORE INSERT ON "public"."document_versions" FOR EACH ROW EXECUTE FUNCTION "public"."set_document_version_number"();



CREATE OR REPLACE TRIGGER "trg_superintendent_scope_nonprofits_updated_at" BEFORE UPDATE ON "public"."superintendent_scope_nonprofits" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "user_profiles_with_roles_upsert_trg" INSTEAD OF INSERT OR UPDATE ON "public"."user_profiles_with_roles" FOR EACH ROW EXECUTE FUNCTION "public"."upsert_profiles_and_roles"();



ALTER TABLE ONLY "branding"."asset_slots"
    ADD CONSTRAINT "asset_slots_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "branding"."asset_categories"("id");



ALTER TABLE ONLY "branding"."asset_slots"
    ADD CONSTRAINT "asset_slots_entity_type_fkey" FOREIGN KEY ("entity_type") REFERENCES "public"."entity_types"("key");



ALTER TABLE ONLY "branding"."asset_slots"
    ADD CONSTRAINT "asset_slots_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "branding"."asset_subcategories"("id");



ALTER TABLE ONLY "branding"."asset_subcategories"
    ADD CONSTRAINT "asset_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "branding"."asset_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "branding"."assets"
    ADD CONSTRAINT "assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "branding"."asset_categories"("id");



ALTER TABLE ONLY "branding"."assets"
    ADD CONSTRAINT "assets_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "branding"."assets"
    ADD CONSTRAINT "assets_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "branding"."asset_subcategories"("id");



ALTER TABLE ONLY "branding"."palette_colors"
    ADD CONSTRAINT "palette_colors_palette_fk" FOREIGN KEY ("palette_id") REFERENCES "branding"."palettes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "branding"."palettes"
    ADD CONSTRAINT "palettes_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id");



ALTER TABLE ONLY "branding"."patterns"
    ADD CONSTRAINT "patterns_entity_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "branding"."typography"
    ADD CONSTRAINT "typography_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id");



ALTER TABLE ONLY "governance"."approvals"
    ADD CONSTRAINT "approvals_board_member_id_fkey" FOREIGN KEY ("board_member_id") REFERENCES "governance"."board_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "governance"."approvals"
    ADD CONSTRAINT "approvals_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "governance"."board_meetings"
    ADD CONSTRAINT "board_meetings_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "governance"."boards"("id");



ALTER TABLE ONLY "governance"."board_members"
    ADD CONSTRAINT "board_members_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "governance"."boards"("id");



ALTER TABLE ONLY "governance"."meeting_attendance"
    ADD CONSTRAINT "meeting_attendance_board_member_id_fkey" FOREIGN KEY ("board_member_id") REFERENCES "governance"."board_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "governance"."meeting_attendance"
    ADD CONSTRAINT "meeting_attendance_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "governance"."board_meetings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "governance"."meeting_minutes"
    ADD CONSTRAINT "meeting_minutes_amended_from_fkey" FOREIGN KEY ("amended_from_id") REFERENCES "governance"."meeting_minutes"("id");



ALTER TABLE ONLY "governance"."meeting_minutes"
    ADD CONSTRAINT "meeting_minutes_finalized_by_fkey" FOREIGN KEY ("finalized_by") REFERENCES "governance"."board_members"("id");



ALTER TABLE ONLY "governance"."meeting_minutes"
    ADD CONSTRAINT "meeting_minutes_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "governance"."board_meetings"("id");



ALTER TABLE ONLY "governance"."motions"
    ADD CONSTRAINT "motions_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "governance"."board_meetings"("id");



ALTER TABLE ONLY "governance"."votes"
    ADD CONSTRAINT "votes_motion_id_fkey" FOREIGN KEY ("motion_id") REFERENCES "governance"."motions"("id");



ALTER TABLE ONLY "irs"."entity_links"
    ADD CONSTRAINT "entity_links_ein_fkey" FOREIGN KEY ("ein") REFERENCES "irs"."organizations"("ein") ON DELETE CASCADE;



ALTER TABLE ONLY "irs"."entity_links"
    ADD CONSTRAINT "entity_links_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "irs"."return_documents"
    ADD CONSTRAINT "return_documents_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "irs"."returns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "irs"."return_financials"
    ADD CONSTRAINT "return_financials_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "irs"."returns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "irs"."return_narratives"
    ADD CONSTRAINT "return_narratives_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "irs"."returns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "irs"."return_people"
    ADD CONSTRAINT "return_people_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "irs"."returns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "irs"."return_restrictions"
    ADD CONSTRAINT "return_restrictions_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "irs"."returns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "irs"."return_restrictions"
    ADD CONSTRAINT "return_restrictions_source_narrative_id_fkey" FOREIGN KEY ("source_narrative_id") REFERENCES "irs"."return_narratives"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "irs"."returns"
    ADD CONSTRAINT "returns_ein_fkey" FOREIGN KEY ("ein") REFERENCES "irs"."organizations"("ein") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id");



ALTER TABLE ONLY "public"."district_metadata"
    ADD CONSTRAINT "district_metadata_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_versions"
    ADD CONSTRAINT "document_versions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."document_versions"
    ADD CONSTRAINT "document_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."document_versions"
    ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_current_version_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."document_versions"("id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id");



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_entity_type_fkey" FOREIGN KEY ("entity_type") REFERENCES "public"."entity_types"("key") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."entity_attributes"
    ADD CONSTRAINT "entity_attributes_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_contacts"
    ADD CONSTRAINT "entity_contacts_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_field_overrides"
    ADD CONSTRAINT "entity_field_overrides_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_geometries"
    ADD CONSTRAINT "entity_geometries_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_onboarding_progress"
    ADD CONSTRAINT "entity_onboarding_progress_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_person_claims"
    ADD CONSTRAINT "entity_person_claims_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."entity_person_claims"
    ADD CONSTRAINT "entity_person_claims_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_relationships"
    ADD CONSTRAINT "entity_relationships_child_entity_id_fkey" FOREIGN KEY ("child_entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_relationships"
    ADD CONSTRAINT "entity_relationships_parent_entity_id_fkey" FOREIGN KEY ("parent_entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_source_records"
    ADD CONSTRAINT "entity_source_records_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_status"
    ADD CONSTRAINT "entity_status_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_users"
    ADD CONSTRAINT "entity_users_entity_ref_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id");



ALTER TABLE ONLY "public"."entity_users"
    ADD CONSTRAINT "entity_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nonprofits"
    ADD CONSTRAINT "nonprofits_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_program_location_metadata"
    ADD CONSTRAINT "school_program_location_metadata_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."superintendent_scope_nonprofits"
    ADD CONSTRAINT "superintendent_scope_nonprofits_district_entity_id_fkey" FOREIGN KEY ("district_entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."superintendent_scope_nonprofits"
    ADD CONSTRAINT "superintendent_scope_nonprofits_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE SET NULL;



ALTER TABLE "branding"."asset_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "branding"."asset_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "branding"."asset_subcategories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "branding"."assets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "branding_asset_categories_select" ON "branding"."asset_categories" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "branding_asset_categories_write" ON "branding"."asset_categories" TO "authenticated" USING ("public"."is_global_admin"("auth"."uid"())) WITH CHECK ("public"."is_global_admin"("auth"."uid"()));



CREATE POLICY "branding_asset_slots_select" ON "branding"."asset_slots" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "branding_asset_slots_write" ON "branding"."asset_slots" TO "authenticated" USING ("public"."is_global_admin"("auth"."uid"())) WITH CHECK ("public"."is_global_admin"("auth"."uid"()));



CREATE POLICY "branding_asset_subcategories_select" ON "branding"."asset_subcategories" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "branding_asset_subcategories_write" ON "branding"."asset_subcategories" TO "authenticated" USING ("public"."is_global_admin"("auth"."uid"())) WITH CHECK ("public"."is_global_admin"("auth"."uid"()));



CREATE POLICY "branding_assets_delete" ON "branding"."assets" FOR DELETE TO "authenticated" USING ("public"."can_manage_entity_assets"("auth"."uid"(), "entity_id"));



CREATE POLICY "branding_assets_insert" ON "branding"."assets" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_entity_assets"("auth"."uid"(), "entity_id"));



CREATE POLICY "branding_assets_select" ON "branding"."assets" FOR SELECT USING (true);



CREATE POLICY "branding_assets_update" ON "branding"."assets" FOR UPDATE TO "authenticated" USING ("public"."can_manage_entity_assets"("auth"."uid"(), "entity_id")) WITH CHECK ("public"."can_manage_entity_assets"("auth"."uid"(), "entity_id"));



CREATE POLICY "branding_palette_colors_select" ON "branding"."palette_colors" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "branding_palettes_select" ON "branding"."palettes" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "branding_patterns_delete" ON "branding"."patterns" FOR DELETE TO "authenticated" USING ("public"."can_manage_entity_assets"("auth"."uid"(), "entity_id"));



CREATE POLICY "branding_patterns_insert" ON "branding"."patterns" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_entity_assets"("auth"."uid"(), "entity_id"));



CREATE POLICY "branding_patterns_select" ON "branding"."patterns" FOR SELECT USING (true);



CREATE POLICY "branding_patterns_update" ON "branding"."patterns" FOR UPDATE TO "authenticated" USING ("public"."can_manage_entity_assets"("auth"."uid"(), "entity_id")) WITH CHECK ("public"."can_manage_entity_assets"("auth"."uid"(), "entity_id"));



CREATE POLICY "branding_typography_delete" ON "branding"."typography" FOR DELETE TO "authenticated" USING ("public"."can_manage_entity_assets"("auth"."uid"(), "entity_id"));



CREATE POLICY "branding_typography_insert" ON "branding"."typography" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_entity_assets"("auth"."uid"(), "entity_id"));



CREATE POLICY "branding_typography_select" ON "branding"."typography" FOR SELECT USING (true);



CREATE POLICY "branding_typography_update" ON "branding"."typography" FOR UPDATE TO "authenticated" USING ("public"."can_manage_entity_assets"("auth"."uid"(), "entity_id")) WITH CHECK ("public"."can_manage_entity_assets"("auth"."uid"(), "entity_id"));



ALTER TABLE "branding"."palette_colors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "branding"."palettes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "branding"."patterns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "branding"."typography" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "governance"."approvals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "approvals read" ON "governance"."approvals" FOR SELECT TO "authenticated" USING ("governance"."can_read_entity"("entity_id", "auth"."uid"()));



CREATE POLICY "approvals write service" ON "governance"."approvals" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "approvals_read" ON "governance"."approvals" FOR SELECT TO "authenticated" USING (("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("entity_id", "auth"."uid"()) OR "governance"."is_board_member"("entity_id", "auth"."uid"())));



CREATE POLICY "approvals_write_service_role" ON "governance"."approvals" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "governance"."board_meetings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "board_meetings read" ON "governance"."board_meetings" FOR SELECT TO "authenticated" USING (("governance"."can_read_board"("board_id", "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "governance"."boards" "b"
  WHERE (("b"."id" = "board_meetings"."board_id") AND "governance"."can_read_entity"("b"."entity_id", "auth"."uid"()))))));



CREATE POLICY "board_meetings write service" ON "governance"."board_meetings" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "governance"."board_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "board_members read" ON "governance"."board_members" FOR SELECT TO "authenticated" USING (("governance"."can_read_board"("board_id", "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "governance"."boards" "b"
  WHERE (("b"."id" = "board_members"."board_id") AND "governance"."can_read_entity"("b"."entity_id", "auth"."uid"()))))));



CREATE POLICY "board_members write service" ON "governance"."board_members" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "governance"."boards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "boards read" ON "governance"."boards" FOR SELECT TO "authenticated" USING ("governance"."can_read_entity"("entity_id", "auth"."uid"()));



CREATE POLICY "boards write service" ON "governance"."boards" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "governance"."meeting_attendance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "meeting_attendance read" ON "governance"."meeting_attendance" FOR SELECT TO "authenticated" USING ("governance"."can_read_meeting"("meeting_id", "auth"."uid"()));



CREATE POLICY "meeting_attendance write service" ON "governance"."meeting_attendance" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "meeting_attendance_read" ON "governance"."meeting_attendance" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("governance"."board_meetings" "mtg"
     JOIN "governance"."boards" "b" ON (("b"."id" = "mtg"."board_id")))
  WHERE (("mtg"."id" = "meeting_attendance"."meeting_id") AND ("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("b"."entity_id", "auth"."uid"()) OR "governance"."is_board_member_for_board"("mtg"."board_id", "auth"."uid"()))))));



CREATE POLICY "meeting_attendance_write_service_role" ON "governance"."meeting_attendance" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "governance"."meeting_minutes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "meeting_minutes read" ON "governance"."meeting_minutes" FOR SELECT TO "authenticated" USING ("governance"."can_read_meeting"("meeting_id", "auth"."uid"()));



CREATE POLICY "meeting_minutes write service" ON "governance"."meeting_minutes" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "governance"."motions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "motions read" ON "governance"."motions" FOR SELECT TO "authenticated" USING ("governance"."can_read_meeting"("meeting_id", "auth"."uid"()));



CREATE POLICY "motions write service" ON "governance"."motions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "governance"."votes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "votes read" ON "governance"."votes" FOR SELECT TO "authenticated" USING (("public"."is_global_admin"("auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM (("governance"."motions" "mo"
     JOIN "governance"."board_meetings" "m" ON (("m"."id" = "mo"."meeting_id")))
     JOIN "governance"."boards" "b" ON (("b"."id" = "m"."board_id")))
  WHERE (("mo"."id" = "votes"."motion_id") AND ("governance"."can_read_entity"("b"."entity_id", "auth"."uid"()) OR "governance"."can_read_board"("m"."board_id", "auth"."uid"())))))));



CREATE POLICY "votes write service" ON "governance"."votes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can read irs organizations" ON "irs"."organizations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "entity admins can manage irs links" ON "irs"."entity_links" USING ("public"."can_read_entity"("entity_id", "auth"."uid"())) WITH CHECK ("public"."can_read_entity"("entity_id", "auth"."uid"()));



ALTER TABLE "irs"."entity_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "irs_financials_read" ON "irs"."return_financials" FOR SELECT TO "authenticated" USING ("irs"."can_access_ein"(( SELECT "r"."ein"
   FROM "irs"."returns" "r"
  WHERE ("r"."id" = "return_financials"."return_id"))));



CREATE POLICY "irs_links_read" ON "irs"."entity_links" FOR SELECT TO "authenticated" USING ("public"."is_entity_admin"("entity_id"));



CREATE POLICY "irs_narratives_read" ON "irs"."return_narratives" FOR SELECT TO "authenticated" USING ("irs"."can_access_ein"(( SELECT "r"."ein"
   FROM "irs"."returns" "r"
  WHERE ("r"."id" = "return_narratives"."return_id"))));



CREATE POLICY "irs_orgs_read" ON "irs"."organizations" FOR SELECT TO "authenticated" USING ("irs"."can_access_ein"("ein"));



CREATE POLICY "irs_people_read" ON "irs"."return_people" FOR SELECT TO "authenticated" USING ("irs"."can_access_ein"(( SELECT "r"."ein"
   FROM "irs"."returns" "r"
  WHERE ("r"."id" = "return_people"."return_id"))));



CREATE POLICY "irs_restrictions_read" ON "irs"."return_restrictions" FOR SELECT TO "authenticated" USING ("irs"."can_access_ein"(( SELECT "r"."ein"
   FROM "irs"."returns" "r"
  WHERE ("r"."id" = "return_restrictions"."return_id"))));



CREATE POLICY "irs_returns_read" ON "irs"."returns" FOR SELECT TO "authenticated" USING ("irs"."can_access_ein"("ein"));



ALTER TABLE "irs"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "irs"."return_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "irs"."return_financials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "irs"."return_narratives" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "irs"."return_people" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "irs"."return_restrictions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "irs"."returns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Allow authorized delete access" ON "public"."messages" FOR DELETE USING ("public"."authorize"('messages.delete'::"public"."app_permission"));



CREATE POLICY "Allow individual delete access" ON "public"."messages" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual insert access" ON "public"."messages" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual update access" ON "public"."messages" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow logged-in read access" ON "public"."messages" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow users and admins to insert profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "id") OR (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Allow users and admins to update profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "id") OR (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"))) WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Superintendent scope read" ON "public"."superintendent_scope_nonprofits" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can insert own profile; admins any" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "id") OR (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "id") OR (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")));



ALTER TABLE "public"."document_versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "document_versions delete admin" ON "public"."document_versions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."documents" "d"
  WHERE (("d"."id" = "document_versions"."document_id") AND ("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("d"."entity_id", "auth"."uid"()))))));



CREATE POLICY "document_versions insert admin" ON "public"."document_versions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."documents" "d"
  WHERE (("d"."id" = "document_versions"."document_id") AND ("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("d"."entity_id", "auth"."uid"()))))));



CREATE POLICY "document_versions read" ON "public"."document_versions" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."documents" "d"
  WHERE (("d"."id" = "document_versions"."document_id") AND ("d"."visibility" = 'public'::"public"."document_visibility") AND ("d"."status" = 'active'::"public"."document_status")))));



CREATE POLICY "document_versions read by document access" ON "public"."document_versions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."documents" "d"
     JOIN "public"."entity_users" "eu" ON (("eu"."entity_id" = "d"."entity_id")))
  WHERE (("d"."id" = "document_versions"."document_id") AND ("eu"."user_id" = "auth"."uid"()) AND ("eu"."status" = 'active'::"text")))));



CREATE POLICY "document_versions update" ON "public"."document_versions" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) AND ("status" = 'draft'::"public"."document_version_status"))) WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "document_versions update admin" ON "public"."document_versions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."documents" "d"
  WHERE (("d"."id" = "document_versions"."document_id") AND ("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("d"."entity_id", "auth"."uid"())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."documents" "d"
  WHERE (("d"."id" = "document_versions"."document_id") AND ("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("d"."entity_id", "auth"."uid"()))))));



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documents delete admin" ON "public"."documents" FOR DELETE TO "authenticated" USING (("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("entity_id", "auth"."uid"())));



CREATE POLICY "documents insert admin" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("entity_id", "auth"."uid"())));



CREATE POLICY "documents read" ON "public"."documents" FOR SELECT TO "authenticated", "anon" USING ((("visibility" = 'public'::"public"."document_visibility") AND ("status" = 'active'::"public"."document_status")));



CREATE POLICY "documents read entity users" ON "public"."documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."entity_users" "eu"
  WHERE (("eu"."entity_id" = "documents"."entity_id") AND ("eu"."user_id" = "auth"."uid"()) AND ("eu"."status" = 'active'::"text")))));



CREATE POLICY "documents update admin" ON "public"."documents" FOR UPDATE TO "authenticated" USING (("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("entity_id", "auth"."uid"()))) WITH CHECK (("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("entity_id", "auth"."uid"())));



CREATE POLICY "entity admins can insert person claims" ON "public"."entity_person_claims" FOR INSERT WITH CHECK ("governance"."can_read_entity"("entity_id", "auth"."uid"()));



CREATE POLICY "entity admins can read onboarding progress" ON "public"."entity_onboarding_progress" FOR SELECT USING ("governance"."can_read_entity"("entity_id", "auth"."uid"()));



CREATE POLICY "entity admins can read overrides" ON "public"."entity_field_overrides" FOR SELECT USING ("governance"."can_read_entity"("entity_id", "auth"."uid"()));



CREATE POLICY "entity admins can read person claims" ON "public"."entity_person_claims" FOR SELECT USING ("governance"."can_read_entity"("entity_id", "auth"."uid"()));



CREATE POLICY "entity admins can update onboarding progress" ON "public"."entity_onboarding_progress" FOR UPDATE USING ("governance"."can_read_entity"("entity_id", "auth"."uid"())) WITH CHECK ("governance"."can_read_entity"("entity_id", "auth"."uid"()));



CREATE POLICY "entity admins can update overrides" ON "public"."entity_field_overrides" FOR UPDATE USING ("governance"."can_read_entity"("entity_id", "auth"."uid"())) WITH CHECK ("governance"."can_read_entity"("entity_id", "auth"."uid"()));



CREATE POLICY "entity admins can update person claims" ON "public"."entity_person_claims" FOR UPDATE USING ("governance"."can_read_entity"("entity_id", "auth"."uid"())) WITH CHECK ("governance"."can_read_entity"("entity_id", "auth"."uid"()));



CREATE POLICY "entity admins can upsert onboarding progress" ON "public"."entity_onboarding_progress" FOR INSERT WITH CHECK ("governance"."can_read_entity"("entity_id", "auth"."uid"()));



CREATE POLICY "entity admins can write overrides" ON "public"."entity_field_overrides" FOR INSERT WITH CHECK ("governance"."can_read_entity"("entity_id", "auth"."uid"()));



ALTER TABLE "public"."entity_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entity_contacts_read_authenticated" ON "public"."entity_contacts" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."entity_field_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entity_onboarding_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entity_person_claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entity_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entity_users_delete_admin" ON "public"."entity_users" FOR DELETE TO "authenticated" USING (("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("auth"."uid"(), "entity_id")));



CREATE POLICY "entity_users_insert_admin" ON "public"."entity_users" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("auth"."uid"(), "entity_id")));



CREATE POLICY "entity_users_select_self" ON "public"."entity_users" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "entity_users_update_admin" ON "public"."entity_users" FOR UPDATE TO "authenticated" USING (("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("auth"."uid"(), "entity_id"))) WITH CHECK (("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("auth"."uid"(), "entity_id")));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nonprofits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nonprofits_delete" ON "public"."nonprofits" FOR DELETE USING (("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("entity_id")));



CREATE POLICY "nonprofits_insert" ON "public"."nonprofits" FOR INSERT WITH CHECK (("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("entity_id")));



CREATE POLICY "nonprofits_read" ON "public"."nonprofits" FOR SELECT USING (("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("entity_id")));



CREATE POLICY "nonprofits_update" ON "public"."nonprofits" FOR UPDATE USING (("public"."is_global_admin"("auth"."uid"()) OR "public"."is_entity_admin"("entity_id")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."superintendent_scope_nonprofits" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "branding" TO "anon";
GRANT USAGE ON SCHEMA "branding" TO "authenticated";
GRANT USAGE ON SCHEMA "branding" TO "service_role";



GRANT USAGE ON SCHEMA "extensions" TO "anon";
GRANT USAGE ON SCHEMA "extensions" TO "authenticated";
GRANT USAGE ON SCHEMA "extensions" TO "service_role";
GRANT ALL ON SCHEMA "extensions" TO "dashboard_user";



GRANT USAGE ON SCHEMA "governance" TO "authenticated";



GRANT USAGE ON SCHEMA "irs" TO "service_role";
GRANT USAGE ON SCHEMA "irs" TO "authenticated";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "branding"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "branding"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "branding"."touch_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "governance"."_object_exists"("p_schema" "text", "p_name" "text", "p_kind" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "governance"."approve_document_version"("p_document_version_id" "uuid", "p_meeting_id" "uuid", "p_signature_hash" "text", "p_approval_method" "text", "p_ip" "inet") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."approve_document_version"("p_document_version_id" "uuid", "p_meeting_id" "uuid", "p_signature_hash" "text", "p_approval_method" "text", "p_ip" "inet") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."approve_meeting_minutes"("p_meeting_id" "uuid", "p_signature_hash" "text", "p_approval_method" "text", "p_ip" "inet") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."approve_meeting_minutes"("p_meeting_id" "uuid", "p_signature_hash" "text", "p_approval_method" "text", "p_ip" "inet") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."assert_can_adjourn_meeting"("p_board_id" "uuid", "p_presiding_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "governance"."assert_can_start_meeting"("p_board_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "governance"."can_read_board"("p_board_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."can_read_board"("p_board_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "governance"."can_read_board"("p_board_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "governance"."can_read_entity"("p_entity_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."can_read_entity"("p_entity_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "governance"."can_read_entity"("p_entity_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "governance"."can_read_meeting"("p_meeting_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."can_read_meeting"("p_meeting_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "governance"."can_read_meeting"("p_meeting_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "governance"."create_board_packet_for_meeting"("p_meeting_id" "uuid", "p_title" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."create_board_packet_for_meeting"("p_meeting_id" "uuid", "p_title" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."current_user_id"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "governance"."enforce_meeting_packet_consistency"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "governance"."enforce_votes_open"() FROM PUBLIC;



GRANT SELECT ON TABLE "governance"."board_meetings" TO "authenticated";
GRANT ALL ON TABLE "governance"."board_meetings" TO "service_role";



REVOKE ALL ON FUNCTION "governance"."finalize_meeting"("p_meeting_id" "uuid", "p_signature_hash" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "governance"."finalize_motion"("p_motion_id" "uuid", "p_signature_hash" "text", "p_approval_method" "text", "p_ip" "inet") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."finalize_motion"("p_motion_id" "uuid", "p_signature_hash" "text", "p_approval_method" "text", "p_ip" "inet") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."is_board_chair"("p_entity_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."is_board_chair"("p_entity_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."is_board_chair"("p_entity_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."is_board_chair"("p_entity_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."is_board_chair_for_board"("p_board_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."is_board_chair_for_board"("p_board_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."is_board_member"("p_entity_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."is_board_member"("p_entity_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."is_board_member"("p_entity_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."is_board_member"("p_entity_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."is_board_member_current"("p_board_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."is_board_member_current"("p_board_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."is_board_member_for_board"("p_board_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."is_board_member_for_board"("p_board_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."is_board_officer"("p_board_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."is_board_officer"("p_board_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."is_board_officer_current"("p_board_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."is_board_officer_current"("p_board_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."is_quorum_met"("p_meeting_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."is_quorum_met"("p_meeting_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."meeting_is_adjourned_for_motion"("p_motion_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."meeting_is_adjourned_for_motion"("p_motion_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."prevent_approval_modifications"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "governance"."prevent_minutes_update_when_locked"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "governance"."prevent_minutes_updates_after_approval"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "governance"."prevent_motion_updates_after_finalize"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "governance"."prevent_vote_updates"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "governance"."quorum_required_for_meeting"("p_meeting_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."quorum_required_for_meeting"("p_meeting_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."set_board_packet_version"("p_meeting_id" "uuid", "p_document_version_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "governance"."set_board_packet_version"("p_meeting_id" "uuid", "p_document_version_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "governance"."trg_board_meetings_enforce_lifecycle"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "governance"."trg_minutes_auto_version"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "governance"."trg_minutes_immutable_if_finalized"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "governance"."trg_votes_block_after_adjournment"() FROM PUBLIC;



GRANT ALL ON FUNCTION "irs"."can_access_ein"("p_ein" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."_geom_from_geojson_4326"("p_geojson" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."_geom_from_geojson_4326"("p_geojson" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_geom_from_geojson_4326"("p_geojson" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "public"."app_permission") TO "anon";
GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "public"."app_permission") TO "authenticated";
GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "public"."app_permission") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_entity_assets"("p_user_id" "uuid", "p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_entity_assets"("p_user_id" "uuid", "p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_entity_assets"("p_user_id" "uuid", "p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_read_entity"("p_entity_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_read_entity"("p_entity_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_read_entity"("p_entity_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user"("email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user"("email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user"("email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."ensure_scope_nonprofit_entity"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_scope_nonprofit_entity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_scope_nonprofit_entity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_entity_admin"("p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_entity_admin"("p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_entity_admin"("p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_entity_admin"("p_user_id" "uuid", "p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_entity_admin"("p_user_id" "uuid", "p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_entity_admin"("p_user_id" "uuid", "p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_entity_user"("p_user_id" "uuid", "p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_entity_user"("p_user_id" "uuid", "p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_entity_user"("p_user_id" "uuid", "p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_global_admin"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_global_admin"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_global_admin"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_schools_to_districts"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."link_schools_to_districts"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_schools_to_districts"("p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."on_document_version_approved"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_document_version_approved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_document_version_approved"() TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_geom_from_geojson_4326"("p_geojson" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_geom_from_geojson_4326"("p_geojson" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_geom_from_geojson_4326"("p_geojson" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_document_version_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_document_version_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_document_version_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_entity_geometry_from_geojson"("p_entity_id" "uuid", "p_geojson" "jsonb", "p_geometry_type" "text", "p_source" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_entity_geometry_from_geojson"("p_entity_id" "uuid", "p_geojson" "jsonb", "p_geometry_type" "text", "p_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_entity_geometry_from_geojson"("p_entity_id" "uuid", "p_geojson" "jsonb", "p_geometry_type" "text", "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_entity_geometry_from_geojson"("p_entity_id" "uuid", "p_geojson" "jsonb", "p_geometry_type" "text", "p_source" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_entity_geometry_from_geojson"("p_entity_id" "uuid", "p_geojson" "jsonb", "p_geometry_type" "text", "p_simplified_type" "text", "p_simplify" boolean, "p_source" "text", "p_tolerance" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_entity_geometry_from_geojson"("p_entity_id" "uuid", "p_geojson" "jsonb", "p_geometry_type" "text", "p_simplified_type" "text", "p_simplify" boolean, "p_source" "text", "p_tolerance" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_entity_geometry_from_geojson"("p_entity_id" "uuid", "p_geojson" "jsonb", "p_geometry_type" "text", "p_simplified_type" "text", "p_simplify" boolean, "p_source" "text", "p_tolerance" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_entity_geometry_with_geom_geojson"("p_entity_id" "uuid", "p_geometry_type" "text", "p_geojson" "jsonb", "p_geom_geojson" "jsonb", "p_bbox" "jsonb", "p_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_entity_geometry_with_geom_geojson"("p_entity_id" "uuid", "p_geometry_type" "text", "p_geojson" "jsonb", "p_geom_geojson" "jsonb", "p_bbox" "jsonb", "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_entity_geometry_with_geom_geojson"("p_entity_id" "uuid", "p_geometry_type" "text", "p_geojson" "jsonb", "p_geom_geojson" "jsonb", "p_bbox" "jsonb", "p_source" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_profiles_and_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_profiles_and_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_profiles_and_roles"() TO "service_role";



GRANT SELECT ON TABLE "branding"."asset_categories" TO "anon";
GRANT SELECT ON TABLE "branding"."asset_categories" TO "authenticated";
GRANT ALL ON TABLE "branding"."asset_categories" TO "service_role";



GRANT SELECT ON TABLE "branding"."asset_slots" TO "anon";
GRANT SELECT ON TABLE "branding"."asset_slots" TO "authenticated";
GRANT ALL ON TABLE "branding"."asset_slots" TO "service_role";



GRANT SELECT ON TABLE "branding"."asset_subcategories" TO "anon";
GRANT SELECT ON TABLE "branding"."asset_subcategories" TO "authenticated";
GRANT ALL ON TABLE "branding"."asset_subcategories" TO "service_role";



GRANT SELECT ON TABLE "branding"."assets" TO "anon";
GRANT SELECT ON TABLE "branding"."assets" TO "authenticated";
GRANT ALL ON TABLE "branding"."assets" TO "service_role";



GRANT ALL ON TABLE "branding"."palette_colors" TO "service_role";
GRANT SELECT ON TABLE "branding"."palette_colors" TO "anon";
GRANT SELECT ON TABLE "branding"."palette_colors" TO "authenticated";



GRANT ALL ON TABLE "branding"."palettes" TO "service_role";
GRANT SELECT ON TABLE "branding"."palettes" TO "anon";
GRANT SELECT ON TABLE "branding"."palettes" TO "authenticated";



GRANT SELECT ON TABLE "branding"."patterns" TO "anon";
GRANT SELECT ON TABLE "branding"."patterns" TO "authenticated";
GRANT ALL ON TABLE "branding"."patterns" TO "service_role";



GRANT SELECT ON TABLE "branding"."typography" TO "anon";
GRANT SELECT ON TABLE "branding"."typography" TO "authenticated";
GRANT ALL ON TABLE "branding"."typography" TO "service_role";



GRANT SELECT ON TABLE "governance"."approvals" TO "authenticated";
GRANT ALL ON TABLE "governance"."approvals" TO "service_role";



GRANT SELECT ON TABLE "governance"."board_members" TO "authenticated";
GRANT ALL ON TABLE "governance"."board_members" TO "service_role";



GRANT SELECT ON TABLE "governance"."boards" TO "authenticated";
GRANT ALL ON TABLE "governance"."boards" TO "service_role";



GRANT SELECT ON TABLE "governance"."meeting_attendance" TO "authenticated";
GRANT ALL ON TABLE "governance"."meeting_attendance" TO "service_role";



GRANT SELECT ON TABLE "governance"."meeting_minutes" TO "authenticated";
GRANT ALL ON TABLE "governance"."meeting_minutes" TO "service_role";



GRANT SELECT ON TABLE "governance"."meeting_minutes_expanded" TO "authenticated";
GRANT ALL ON TABLE "governance"."meeting_minutes_expanded" TO "service_role";



GRANT SELECT ON TABLE "governance"."motions" TO "authenticated";
GRANT ALL ON TABLE "governance"."motions" TO "service_role";



GRANT SELECT ON TABLE "governance"."votes" TO "authenticated";
GRANT ALL ON TABLE "governance"."votes" TO "service_role";



GRANT ALL ON TABLE "irs"."entity_links" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "irs"."entity_links" TO "authenticated";



GRANT ALL ON TABLE "irs"."returns" TO "service_role";



GRANT ALL ON TABLE "irs"."latest_returns" TO "service_role";
GRANT SELECT ON TABLE "irs"."latest_returns" TO "authenticated";



GRANT ALL ON TABLE "irs"."return_financials" TO "service_role";



GRANT ALL ON TABLE "irs"."latest_financials" TO "service_role";
GRANT SELECT ON TABLE "irs"."latest_financials" TO "authenticated";



GRANT ALL ON TABLE "irs"."organizations" TO "service_role";
GRANT SELECT ON TABLE "irs"."organizations" TO "authenticated";



GRANT ALL ON TABLE "irs"."return_documents" TO "service_role";



GRANT ALL ON TABLE "irs"."return_narratives" TO "service_role";



GRANT ALL ON TABLE "irs"."return_people" TO "service_role";



GRANT ALL ON TABLE "irs"."return_restrictions" TO "service_role";



GRANT ALL ON TABLE "public"."businesses" TO "anon";
GRANT ALL ON TABLE "public"."businesses" TO "authenticated";
GRANT ALL ON TABLE "public"."businesses" TO "service_role";



GRANT ALL ON TABLE "public"."district_metadata" TO "anon";
GRANT ALL ON TABLE "public"."district_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."district_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."document_versions" TO "anon";
GRANT ALL ON TABLE "public"."document_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."document_versions" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."donations" TO "anon";
GRANT ALL ON TABLE "public"."donations" TO "authenticated";
GRANT ALL ON TABLE "public"."donations" TO "service_role";



GRANT ALL ON TABLE "public"."entities" TO "anon";
GRANT ALL ON TABLE "public"."entities" TO "authenticated";
GRANT ALL ON TABLE "public"."entities" TO "service_role";



GRANT ALL ON TABLE "public"."entity_attributes" TO "anon";
GRANT ALL ON TABLE "public"."entity_attributes" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_attributes" TO "service_role";



GRANT ALL ON TABLE "public"."entity_contacts" TO "anon";
GRANT ALL ON TABLE "public"."entity_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."entity_field_overrides" TO "anon";
GRANT ALL ON TABLE "public"."entity_field_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_field_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."entity_geometries" TO "anon";
GRANT ALL ON TABLE "public"."entity_geometries" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_geometries" TO "service_role";



GRANT ALL ON TABLE "public"."entity_onboarding_progress" TO "anon";
GRANT ALL ON TABLE "public"."entity_onboarding_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_onboarding_progress" TO "service_role";



GRANT ALL ON TABLE "public"."entity_person_claims" TO "anon";
GRANT ALL ON TABLE "public"."entity_person_claims" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_person_claims" TO "service_role";



GRANT ALL ON TABLE "public"."entity_relationships" TO "anon";
GRANT ALL ON TABLE "public"."entity_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."entity_source_records" TO "anon";
GRANT ALL ON TABLE "public"."entity_source_records" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_source_records" TO "service_role";



GRANT ALL ON TABLE "public"."entity_status" TO "anon";
GRANT ALL ON TABLE "public"."entity_status" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_status" TO "service_role";



GRANT ALL ON TABLE "public"."entity_types" TO "anon";
GRANT ALL ON TABLE "public"."entity_types" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_types" TO "service_role";



GRANT ALL ON TABLE "public"."entity_users" TO "anon";
GRANT ALL ON TABLE "public"."entity_users" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_users" TO "service_role";



GRANT ALL ON TABLE "public"."mde_org_types" TO "anon";
GRANT ALL ON TABLE "public"."mde_org_types" TO "authenticated";
GRANT ALL ON TABLE "public"."mde_org_types" TO "service_role";



GRANT ALL ON TABLE "public"."mde_school_class_types" TO "anon";
GRANT ALL ON TABLE "public"."mde_school_class_types" TO "authenticated";
GRANT ALL ON TABLE "public"."mde_school_class_types" TO "service_role";



GRANT ALL ON TABLE "public"."mde_states" TO "anon";
GRANT ALL ON TABLE "public"."mde_states" TO "authenticated";
GRANT ALL ON TABLE "public"."mde_states" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."nonprofits" TO "anon";
GRANT ALL ON TABLE "public"."nonprofits" TO "authenticated";
GRANT ALL ON TABLE "public"."nonprofits" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."school_program_location_metadata" TO "anon";
GRANT ALL ON TABLE "public"."school_program_location_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."school_program_location_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."superintendent_scope_nonprofits" TO "anon";
GRANT ALL ON TABLE "public"."superintendent_scope_nonprofits" TO "authenticated";
GRANT ALL ON TABLE "public"."superintendent_scope_nonprofits" TO "service_role";



GRANT ALL ON TABLE "public"."superintendent_scope_nonprofits_ready" TO "anon";
GRANT ALL ON TABLE "public"."superintendent_scope_nonprofits_ready" TO "authenticated";
GRANT ALL ON TABLE "public"."superintendent_scope_nonprofits_ready" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles_with_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles_with_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles_with_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "branding" GRANT SELECT,USAGE ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "branding" GRANT SELECT,USAGE ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "branding" GRANT ALL ON SEQUENCES  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "branding" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "branding" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "branding" GRANT ALL ON FUNCTIONS  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "branding" GRANT SELECT ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "branding" GRANT SELECT ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "branding" GRANT ALL ON TABLES  TO "service_role";












ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();




ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";
