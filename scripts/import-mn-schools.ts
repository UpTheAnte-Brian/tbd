/**
 * Import MN school attendance areas (GeoJSON) into:
 *  - public.schools (one row per school+level)
 *  - public.school_attendance_areas (one row per GeoJSON feature polygon)
 *
 * Why:
 *  - Schools are domain objects.
 *  - Attendance boundaries are spatial data that can change independently.
 *
 * Prereqs (run once):
 *
 *   -- PostGIS
 *   create extension if not exists postgis;
 *
 *   -- Enums
 *   do $$ begin
 *     if not exists (select 1 from pg_type where typname = 'school_level') then
 *       create type public.school_level as enum ('elementary','middle','high');
 *     end if;
 *   end $$;
 *
 *   -- Schools (no geometry)
 *   create table if not exists public.schools (
 *     id uuid primary key default gen_random_uuid(),
 *     orgid text not null,                       -- elem_orgid / midd_orgid / high_orgid
 *     level public.school_level not null,
 *     name text not null,
 *     district_orgid text,                       -- sdorgid from dataset
 *     multi boolean default false,               -- *_multi == 'Y'
 *     properties jsonb,                          -- raw props for reference
 *     created_at timestamptz default now(),
 *     updated_at timestamptz default now()
 *   );
 *   create unique index if not exists schools_orgid_level_uidx
 *     on public.schools (orgid, level);
 *
 *   -- Attendance areas (geometry lives here)
 *   create table if not exists public.school_attendance_areas (
 *     id uuid primary key default gen_random_uuid(),
 *     source_key text not null unique,           -- stable hash of feature (for idempotent upserts)
 *     district_orgid text,
 *     school_id uuid not null references public.schools(id) on delete cascade,
 *     level public.school_level not null,
 *     shape_area double precision,
 *     shape_len double precision,
 *     properties jsonb,
 *     geometry geometry(MultiPolygon, 4326) not null,
 *     created_at timestamptz default now(),
 *     updated_at timestamptz default now()
 *   );
 *   create index if not exists school_attendance_areas_school_id_idx
 *     on public.school_attendance_areas (school_id);
 *   create index if not exists school_attendance_areas_geom_gix
 *     on public.school_attendance_areas using gist (geometry);
 *
 *  Data:
 *   Put the downloaded GeoJSON at scripts/geojson/mn-schools.geojson.
 *
 *  Env:
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   SUPABASE_URL=...
 *
 * Run:
 *   ts-node scripts/import-mn-schools.ts
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Feature, MultiPolygon, Polygon } from "geojson";

type SchoolFeature = Feature<Polygon | MultiPolygon, Record<string, unknown>>;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const geoPath = path.join(__dirname, "geojson", "mn-schools.geojson");

function mapLevel(props: Record<string, unknown>): {
  level: "elementary" | "middle" | "high";
  orgid: string;
  name: string;
  multi?: boolean;
} | null {
  if (props.elem_orgid) {
    return {
      level: "elementary",
      orgid: String(props.elem_orgid),
      name: String(props.elem_name ?? "").trim() || "Unknown Elementary",
      multi: String(props.elem_multi ?? "").toUpperCase() === "Y",
    };
  }
  if (props.midd_orgid) {
    return {
      level: "middle",
      orgid: String(props.midd_orgid),
      name: String(props.midd_name ?? "").trim() || "Unknown Middle",
      multi: String(props.midd_multi ?? "").toUpperCase() === "Y",
    };
  }
  if (props.high_orgid) {
    return {
      level: "high",
      orgid: String(props.high_orgid),
      name: String(props.high_name ?? "").trim() || "Unknown High",
      multi: String(props.high_multi ?? "").toUpperCase() === "Y",
    };
  }
  return null;
}

async function main() {
  const raw = fs.readFileSync(geoPath, "utf8");
  const geojson = JSON.parse(raw) as {
    features: SchoolFeature[];
  };
  const schoolRows: Array<{
    orgid: string;
    level: "elementary" | "middle" | "high";
    name: string;
    district_orgid: string | null;
    multi: boolean;
    properties: Record<string, unknown>;
  }> = [];

  const areaRows: Array<{
    source_key: string;
    district_orgid: string | null;
    orgid: string;
    level: "elementary" | "middle" | "high";
    shape_area: number | null;
    shape_len: number | null;
    properties: Record<string, unknown>;
    geometry: SchoolFeature["geometry"];
  }> = [];

  for (const feature of geojson.features) {
    const props = feature.properties || {};
    const baseDistrictOrgid = props.sdorgid ? String(props.sdorgid) : null;
    const mapped = mapLevel(props);
    if (!mapped) {
      console.warn("Skipping feature with no school orgid/level", props);
      continue;
    }
    const shapeAreaRaw = props.Shape_Area ?? props.shape_area;
    const shapeLenRaw = props.Shape_Leng ?? props.shape_leng ?? props.shape_len;
    const shape_area = typeof shapeAreaRaw === "number"
      ? shapeAreaRaw
      : shapeAreaRaw
      ? Number(shapeAreaRaw)
      : null;
    const shape_len = typeof shapeLenRaw === "number"
      ? shapeLenRaw
      : shapeLenRaw
      ? Number(shapeLenRaw)
      : null;

    // Stable-ish key for idempotent upserts. Includes district + school + level + geometry hash.
    const geomHash = crypto
      .createHash("sha1")
      .update(JSON.stringify(feature.geometry))
      .digest("hex");
    const source_key = `${
      baseDistrictOrgid ?? ""
    }:${mapped.level}:${mapped.orgid}:${geomHash}`;

    schoolRows.push({
      orgid: mapped.orgid,
      level: mapped.level,
      name: mapped.name,
      district_orgid: baseDistrictOrgid,
      multi: Boolean(mapped.multi),
      properties: props,
    });

    areaRows.push({
      source_key,
      district_orgid: baseDistrictOrgid,
      orgid: mapped.orgid,
      level: mapped.level,
      shape_area,
      shape_len,
      properties: props,
      geometry: feature.geometry,
    });
  }

  // Deduplicate schools by orgid+level (GeoJSON may repeat the same school across multiple polygons)
  const schoolKey = (r: { orgid: string; level: string }) =>
    `${r.orgid}::${r.level}`;
  const schoolMap = new Map<string, (typeof schoolRows)[number]>();
  for (const r of schoolRows) schoolMap.set(schoolKey(r), r);
  const uniqueSchools = Array.from(schoolMap.values());

  console.log(
    `Prepared ${uniqueSchools.length} schools and ${areaRows.length} attendance areas. Upserting schools...`,
  );

  const chunkSize = 250;
  const schoolIdByKey = new Map<string, string>();

  for (let i = 0; i < uniqueSchools.length; i += chunkSize) {
    const chunk = uniqueSchools.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("schools")
      .upsert(chunk, { onConflict: "orgid,level" })
      .select("id,orgid,level");

    if (error) {
      console.error("Upsert schools error on batch", i, error.message);
      process.exit(1);
    }

    for (const row of data ?? []) {
      const key = `${row.orgid}::${row.level}`;
      schoolIdByKey.set(key, row.id);
    }
  }

  console.log("Upserting attendance areas...");
  // Convert area rows to DB rows (resolve school_id)
  const dbAreas = areaRows
    .map((r) => {
      const key = `${r.orgid}::${r.level}`;
      const school_id = schoolIdByKey.get(key);
      if (!school_id) return null;
      return {
        source_key: r.source_key,
        district_orgid: r.district_orgid,
        school_id,
        level: r.level,
        shape_area: r.shape_area,
        shape_len: r.shape_len,
        properties: r.properties,
        geometry: r.geometry,
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  for (let i = 0; i < dbAreas.length; i += chunkSize) {
    const chunk = dbAreas.slice(i, i + chunkSize);
    const { error } = await supabase.from("school_attendance_areas").upsert(
      chunk,
      {
        onConflict: "source_key",
      },
    );
    if (error) {
      console.error("Upsert attendance areas error on batch", i, error.message);
      process.exit(1);
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
