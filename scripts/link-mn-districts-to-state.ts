/**
 * link-mn-districts-to-state.ts
 *
 * Ensures entity_relationships contains:
 *   MN (state) --contains--> all MN districts
 *
 * Deterministic + idempotent:
 * - State lookup: ONE stable key (prefer external_ids.usps === 'MN'; fallback to TIGER geoid '27' if present)
 * - District selection: ONE stable key (external_ids.sdorgid exists AND entity_type='district')
 */

import { createClient } from "@supabase/supabase-js";

type SupabaseAdmin = ReturnType<typeof supabaseAdmin>;

type EntityRow = {
  id: string;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function supabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    mustEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function findMinnesotaStateId(supabase: SupabaseAdmin) {
  // ONE stable key, no "try a bunch of random keys".
  // Prefer USPS first because it's human stable and should exist for all state entities.
  // If your schema uses a different key, adjust this section ONLY once.

  // 1) external_ids.usps === 'MN'
  {
    const { data, error } = await supabase
      .from("entities")
      .select("id")
      .eq("entity_type", "state")
      // PostgREST JSON path syntax: external_ids->>usps
      .filter("external_ids->>usps", "eq", "MN")
      .limit(1);

    if (!error && data && data.length === 1) return data[0].id as string;
  }

  // 2) external_ids.geoid === '27' (TIGER state GEOID)
  {
    const { data, error } = await supabase
      .from("entities")
      .select("id")
      .eq("entity_type", "state")
      .filter("external_ids->>geoid", "eq", "27")
      .limit(1);

    if (!error && data && data.length === 1) return data[0].id as string;
  }

  throw new Error(
    "Could not find Minnesota state entity. Expected entities(entity_type='state') with external_ids.usps='MN' OR external_ids.geoid='27'.",
  );
}

async function fetchMnDistrictIds(supabase: SupabaseAdmin) {
  const ids: string[] = [];
  let from = 0;
  const pageSize = 1000;

  for (;;) {
    const { data, error } = await supabase
      .from("entities")
      .select("id")
      .eq("entity_type", "district")
      .filter("external_ids->>sdorgid", "neq", "")
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const rows = (data ?? []) as EntityRow[];
    if (rows.length === 0) break;

    for (const r of rows) ids.push(r.id);
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return ids;
}

async function main() {
  const supabase = supabaseAdmin();

  const stateId = await findMinnesotaStateId(supabase);
  console.log("MN state entity:", stateId);

  const mnDistrictIds = await fetchMnDistrictIds(supabase);
  console.log("MN district entities found:", mnDistrictIds.length);

  const relationshipType = "contains";
  const batchSize = 1000;

  for (let i = 0; i < mnDistrictIds.length; i += batchSize) {
    const batch = mnDistrictIds.slice(i, i + batchSize);

    const payload = batch.map((districtId) => ({
      parent_entity_id: stateId,
      child_entity_id: districtId,
      relationship_type: relationshipType,
    }));

    const { error } = await supabase
      .from("entity_relationships")
      .upsert(payload as any, {
        onConflict: "parent_entity_id,child_entity_id,relationship_type",
      });

    if (error) throw error;

    console.log(
      `Upserted ${Math.min(i + batchSize, mnDistrictIds.length)}/${mnDistrictIds.length}`,
    );
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
