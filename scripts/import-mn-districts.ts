/**
 * import-mn-districts.ts
 *
 * Deterministically seed MN district entities using sdorgid as the stable key.
 * - Stable UUID v5 derived from sdorgid
 * - No fallback matching (no sdnumber/sdtype as "backup keys")
 *
 * Expected to run BEFORE:
 * - import-mn-district-boundaries.ts
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import crypto from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logSupabaseError } from "./lib/supabase-error";
// Never change once committed:
const UUID_NAMESPACE = "2f8c8e8a-7f24-4c0a-9d0a-3bd1a7d3a7b1";
const DATASET_KEY = "mn_mde_bdry_school_district_boundaries";
const VERSION_TAG = "SY2025_26";
const SOURCE_TAG = `${DATASET_KEY}_${VERSION_TAG}`;

// --- UUID v5 helpers (same implementation as boundaries script) ---
function uuidToBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) throw new Error(`Invalid UUID: ${uuid}`);
  return Buffer.from(hex, "hex");
}
function bytesToUuid(buf: Buffer): string {
  const hex = buf.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}
function uuidv5(name: string, namespaceUuid: string): string {
  const ns = uuidToBytes(namespaceUuid);
  const hash = crypto
    .createHash("sha1")
    .update(ns)
    .update(Buffer.from(name, "utf8"))
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // v5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  return bytesToUuid(bytes);
}
function deterministicDistrictEntityId(sdorgid: string): string {
  return uuidv5(`mde_sdorgid:${sdorgid}`, UUID_NAMESPACE);
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const servicekey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
  if (!servicekey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return { url, servicekey };
}
function supabaseAdmin(): SupabaseClient {
  const { url, servicekey } = getSupabaseEnv();
  return createClient(url, servicekey, { auth: { persistSession: false } });
}

function normalizeSdorgid(v: any): string {
  if (v == null) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (s.includes(".")) return s.split(".")[0];
  return s;
}

type Args = {
  reconcile: boolean;
};

function parseArgs(argv: string[]): Args {
  return {
    reconcile: argv.includes("--reconcile"),
  };
}

function cleanString(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function stripNullish(obj: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}

function numOrNull(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function curatedDistrictAttrs(props: Record<string, any>) {
  const sdorgid = normalizeSdorgid(props.sdorgid ?? props.SDORGID);
  const formid = cleanString(props.formid ?? props.FORMID);
  const sdnumber = cleanString(props.sdnumber ?? props.SDNUMBER);
  const sdtype = cleanString(props.sdtype ?? props.SDTYPE);
  const prefname = cleanString(
    props.prefname ?? props.PREFNAME ?? props.sdprefname ?? props.SDPREFNAME,
  );
  const shortname = cleanString(props.shortname ?? props.SHORTNAME);
  const web_url = cleanString(props.web_url ?? props.WEB_URL);

  return stripNullish({
    source: SOURCE_TAG,
    sdorgid,
    formid,
    sdnumber,
    sdtype,
    prefname,
    shortname,
    web_url,
    acres: numOrNull(props.acres ?? props.ACRES),
    sqmiles: numOrNull(props.sqmiles ?? props.SQMILES),
  });
}

type DistrictSeed = {
  id: string;
  sdorgid: string;
  name: string;
  slug: string;
  externalIds: Record<string, string>;
  attrs: Record<string, any>;
  payload: Record<string, any>;
};

// Minimal district naming/slug rules (deterministic)
function districtSlug(sdorgid: string) {
  return `mn-district-${sdorgid}`;
}

async function fetchBoundaryGeojsonSdorgids(): Promise<
  Array<{
    sdorgid: string;
    name: string | null;
    externalIds: Record<string, string>;
    attrs: Record<string, any>;
    payload: Record<string, any>;
  }>
> {
  // Lightweight approach: reuse your already-generated artifact if present.
  // If not present, we fail with an actionable error (avoid "backup"/alternate sources).
  // You can run importDistrictBoundaries -- --generate-only once to create the artifact.
  const fs = await import("fs");
  const path = await import("path");

  const artifact = path.join(
    process.cwd(),
    "scripts",
    "geojson",
    "mn_mde_bdry_school_district_boundaries",
    VERSION_TAG,
    "display.geojson",
  );

  if (!fs.existsSync(artifact)) {
    throw new Error(
      [
        "Missing district boundary artifact:",
        artifact,
        "",
        "Run one of these first to generate it:",
        "  npm run importDistrictBoundaries -- --generate-only",
        "",
        "Then re-run:",
        "  npm run importDistricts:test (or :dev)",
      ].join("\n"),
    );
  }

  const raw = fs.readFileSync(artifact, "utf8");
  const parsed = JSON.parse(raw);
  if (parsed?.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error(`Invalid GeoJSON FeatureCollection: ${artifact}`);
  }

  const out: Array<{
    sdorgid: string;
    name: string | null;
    externalIds: Record<string, string>;
    attrs: Record<string, any>;
    payload: Record<string, any>;
  }> = [];
  for (const f of parsed.features) {
    const props = f?.properties ?? {};
    const sdorgid = normalizeSdorgid(props.sdorgid ?? props.SDORGID);
    if (!sdorgid) continue;

    const name = cleanString(
      props.sdprefname ??
        props.SDPREFNAME ??
        props.sdname ??
        props.isdname ??
        props.name,
    );

    const formid = cleanString(props.formid ?? props.FORMID);
    const sdnumber = cleanString(props.sdnumber ?? props.SDNUMBER);
    const sdtype = cleanString(props.sdtype ?? props.SDTYPE);

    const externalIds: Record<string, string> = { sdorgid };
    if (formid) externalIds.formid = formid;
    if (sdnumber) externalIds.sdnumber = sdnumber;
    if (sdtype) externalIds.sdtype = sdtype;

    out.push({
      sdorgid,
      name,
      externalIds,
      attrs: curatedDistrictAttrs(props),
      payload: props,
    });
  }

  // enforce uniqueness by sdorgid
  const seen = new Set<string>();
  const unique: Array<{
    sdorgid: string;
    name: string | null;
    externalIds: Record<string, string>;
    attrs: Record<string, any>;
    payload: Record<string, any>;
  }> = [];
  for (const r of out) {
    if (seen.has(r.sdorgid)) continue;
    seen.add(r.sdorgid);
    unique.push(r);
  }

  if (!unique.length) {
    throw new Error("No sdorgid values found in the boundary artifact. Cannot deterministically seed districts.");
  }

  return unique;
}

async function updateExternalIds(
  supabase: SupabaseClient,
  rows: DistrictSeed[],
) {
  const ids = rows.map((r) => r.id);
  const { data, error } = await supabase
    .from("entities")
    .select("id, external_ids")
    .in("id", ids);

  if (error) throw error;

  const existingById = new Map<string, Record<string, any>>();
  for (const r of data ?? []) {
    const entityId = (r as any).id as string;
    const externalIds = ((r as any).external_ids ?? {}) as Record<string, any>;
    existingById.set(entityId, externalIds);
  }

  for (const row of rows) {
    const merged = { ...(existingById.get(row.id) ?? {}), ...row.externalIds };
    const { error: updateError } = await supabase
      .from("entities")
      .update({ external_ids: merged } as any)
      .eq("id", row.id);

    if (updateError) throw updateError;
  }
}

async function upsertEntityAttributes(
  supabase: SupabaseClient,
  rows: DistrictSeed[],
) {
  for (const row of rows) {
    const { error } = await supabase
      .from("entity_attributes")
      .upsert(
        {
          entity_id: row.id,
          namespace: "mde",
          attrs: row.attrs,
        } as any,
        { onConflict: "entity_id,namespace" },
      );

    if (error) throw error;
  }
}

async function upsertEntitySourceRecords(
  supabase: SupabaseClient,
  rows: DistrictSeed[],
) {
  for (const row of rows) {
    const { error } = await supabase
      .from("entity_source_records")
      .upsert(
        {
          entity_id: row.id,
          source: SOURCE_TAG,
          external_key: row.sdorgid,
          payload: row.payload,
        } as any,
        { onConflict: "entity_id,source" },
      );

    if (error) throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = supabaseAdmin();

  const districts = await fetchBoundaryGeojsonSdorgids();
  console.log(`Districts discovered from boundary artifact: ${districts.length}`);
  if (args.reconcile) {
    console.log("Reconcile mode enabled");
  }

  // Ensure entity_types includes district + the full set you expect (5 total).
  // We do NOT try to infer "missing" types from other tables.
  const entityTypes = [
    { key: "business", label: "Business", description: "Merchants and employers", active: true },
    { key: "district", label: "District", description: "School districts", active: true },
    { key: "nonprofit", label: "Nonprofit", description: "District foundations and other charities", active: true },
    { key: "school", label: "School", description: "School building/campus entity", active: true },
    { key: "state", label: "State", description: "State-level government entity", active: true },
  ];

  const { error: etErr } = await supabase.from("entity_types").upsert(entityTypes, { onConflict: "key" });
  if (etErr) throw etErr;

  // Upsert deterministic district entities
  const payload: DistrictSeed[] = districts.map((d) => {
    const id = deterministicDistrictEntityId(d.sdorgid);
    const name = d.name ?? `District ${d.sdorgid}`;
    return {
      id,
      sdorgid: d.sdorgid,
      entity_type: "district",
      name,
      slug: districtSlug(d.sdorgid),
      externalIds: d.externalIds,
      attrs: d.attrs,
      payload: d.payload,
    };
  });

  // Upsert in chunks
  const chunkSize = 200;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    if (args.reconcile) {
      for (const row of chunk) {
        const { data, error } = await supabase
          .from("entities")
          .select("id")
          .eq("entity_type", "district")
          .eq("slug", row.slug)
          .limit(1);
        if (error) throw error;

        const existingId = data?.[0]?.id as string | undefined;
        if (existingId && existingId !== row.id) {
          const { error: deleteError } = await supabase
            .from("entities")
            .delete()
            .eq("id", existingId);
          if (deleteError) throw deleteError;
          console.log(
            `Reconciled district slug=${row.slug}: deleted ${existingId} -> ${row.id}`,
          );
        }
      }
    }

    const baseRows = chunk.map((row) => ({
      id: row.id,
      entity_type: "district",
      name: row.name,
      slug: row.slug,
    }));

    const { error } = await supabase
      .from("entities")
      .upsert(baseRows, { onConflict: "id" });
    if (error) throw error;
    await updateExternalIds(supabase, chunk);
    await upsertEntityAttributes(supabase, chunk);
    await upsertEntitySourceRecords(supabase, chunk);
    console.log(`Upserted districts ${i + 1}-${Math.min(i + chunkSize, payload.length)} / ${payload.length}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  logSupabaseError("Import MN districts failed", err);
  process.exit(1);
});
