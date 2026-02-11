/* scripts/geocode-nonprofit-addresses.ts
 *
 * Geocodes primary nonprofit addresses and stores:
 * - public.entity_address_geocodes (raw results)
 * - public.entity_geometries (geometry_type = 'nonprofit_locations')
 *
 * Usage:
 *   npm run geocodeNonprofits -- --limit=100 --offset=0 --once
 *   npm run geocodeNonprofits -- --limit=100 --offset=0 --sleepMs=100
 *   npm run geocodeNonprofits -- --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./lib/load-env";

const loadedEnv = loadEnvFiles();
if (loadedEnv.length > 0) {
  console.log(`Loaded env: ${loadedEnv.join(", ")}`);
}

function getArg(name: string): string | undefined {
  // Supports both: --name=value and --name value
  const argv = process.argv;
  const eqPrefix = `--${name}=`;

  const hitEq = argv.find((a) => a.startsWith(eqPrefix));
  if (hitEq) return hitEq.slice(eqPrefix.length);

  const flag = `--${name}`;
  const idx = argv.findIndex((a) => a === flag);
  if (idx >= 0 && idx + 1 < argv.length) {
    const next = argv[idx + 1];
    if (!next.startsWith("--")) return next;
  }

  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function numArg(name: string, def: number): number {
  const raw = getArg(name);
  if (raw == null) return def;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(
      `Invalid --${name}=${raw}. Expected a non-negative number.`,
    );
  }
  return n;
}

const LIMIT = numArg("limit", 100);
const START_OFFSET = numArg("offset", 0);
const RUN_ONCE = hasFlag("once");
const STOP_AFTER_ZERO_BATCHES = numArg("stopAfterZeroBatches", 2);
const MAX_BATCHES = numArg("maxBatches", 10_000);
const SLEEP_MS = numArg("sleepMs", 0);
const REQUEST_SLEEP_MS = numArg("requestSleepMs", 0);
const DRY_RUN = hasFlag("dry-run") || hasFlag("dryRun");

const GEOMETRY_TYPE = "nonprofit_locations";
const SOURCE_TAG = getArg("source") ?? "geocode_nonprofit_addresses";
const PROVIDER = (getArg("provider") ?? "google").toLowerCase();

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!serviceRole) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY (required for server-side write)",
  );
}

const geocodeKey =
  process.env.GOOGLE_GEOCODING_API_KEY ??
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!geocodeKey) {
  throw new Error(
    "Missing GOOGLE_GEOCODING_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
  );
}

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false },
});

type AddressRow = {
  id: string;
  entity_id: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postal: string | null;
  country: string | null;
  is_primary: boolean | null;
  entity_address_geocodes?: { id: string }[] | null;
};

type GeocodeResult = {
  place_id?: string;
  lat: number;
  lng: number;
  location_type?: string;
  raw: unknown;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildAddressString(row: AddressRow): string {
  const parts = [
    row.address1,
    row.address2,
    row.city,
    row.state,
    row.postal,
    row.country ?? "US",
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  return parts.join(", ");
}

function confidenceForLocationType(locationType?: string): number {
  switch (locationType) {
    case "ROOFTOP":
      return 90;
    case "RANGE_INTERPOLATED":
      return 75;
    case "GEOMETRIC_CENTER":
      return 60;
    case "APPROXIMATE":
      return 40;
    default:
      return 50;
  }
}

async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  if (PROVIDER !== "google") {
    throw new Error(`Unsupported provider: ${PROVIDER}`);
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", geocodeKey);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geocode request failed (${res.status})`);
  }

  const data = (await res.json()) as {
    status?: string;
    results?: Array<{
      place_id?: string;
      geometry?: {
        location?: { lat?: number; lng?: number };
        location_type?: string;
      };
    }>;
  };

  if (data.status !== "OK" || !data.results?.length) {
    return null;
  }

  const top = data.results[0];
  const location = top.geometry?.location;
  const lat = location?.lat;
  const lng = location?.lng;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    place_id: top.place_id,
    lat: Number(lat),
    lng: Number(lng),
    location_type: top.geometry?.location_type,
    raw: data,
  };
}

async function upsertGeometry(params: {
  entityId: string;
  lat: number;
  lng: number;
  source: string;
  properties: Record<string, unknown>;
}) {
  const pointGeometry = {
    type: "Point",
    coordinates: [params.lng, params.lat],
  };

  const featureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: pointGeometry,
        properties: params.properties,
      },
    ],
  };

  if (DRY_RUN) return;

  const { error } = await supabase.rpc(
    "upsert_entity_geometry_from_geojson",
    {
      p_entity_id: params.entityId,
      p_geojson: pointGeometry,
      p_geometry_type: GEOMETRY_TYPE,
      p_source: params.source,
      p_simplified_type: null,
      p_simplify: false,
      p_tolerance: null,
    },
  );

  if (error) throw error;

  const { error: geojsonError } = await supabase
    .from("entity_geometries")
    .update({ geojson: featureCollection } as any)
    .eq("entity_id", params.entityId)
    .eq("geometry_type", GEOMETRY_TYPE);

  if (geojsonError) throw geojsonError;
}

async function insertGeocodeRow(params: {
  entityAddressId: string;
  result: GeocodeResult;
  confidence: number;
}) {
  if (DRY_RUN) return;

  const { error } = await supabase.from("entity_address_geocodes").insert({
    entity_address_id: params.entityAddressId,
    provider: PROVIDER,
    place_id: params.result.place_id ?? null,
    lat: params.result.lat,
    lng: params.result.lng,
    accuracy: params.result.location_type ?? null,
    confidence: params.confidence,
    raw_response: params.result.raw ?? null,
  });

  if (error) throw error;
}

async function fetchCandidateAddresses(offset: number, limit: number) {
  const { data, error } = await supabase
    .from("entity_addresses")
    .select(
      `
        id,
        entity_id,
        address1,
        address2,
        city,
        state,
        postal,
        country,
        is_primary,
        entity_address_geocodes!left(id)
      `,
    )
    .eq("is_primary", true)
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const rows = (data ?? []) as AddressRow[];
  return rows.filter(
    (row) => !row.entity_address_geocodes || row.entity_address_geocodes.length === 0,
  );
}

async function runBatch(offset: number) {
  const rows = await fetchCandidateAddresses(offset, LIMIT);
  let successCount = 0;
  let skipCount = 0;

  for (const row of rows) {
    const address = buildAddressString(row);
    if (!address) {
      skipCount++;
      continue;
    }

    try {
      const result = await geocodeAddress(address);
      if (!result) {
        console.warn(`No geocode result for address: ${address}`);
        skipCount++;
        continue;
      }

      const confidence = confidenceForLocationType(result.location_type);
      await insertGeocodeRow({
        entityAddressId: row.id,
        result,
        confidence,
      });

      await upsertGeometry({
        entityId: row.entity_id,
        lat: result.lat,
        lng: result.lng,
        source: SOURCE_TAG,
        properties: {
          entity_id: row.entity_id,
          entity_address_id: row.id,
          provider: PROVIDER,
          accuracy: result.location_type ?? null,
          confidence,
        },
      });

      successCount++;

      if (REQUEST_SLEEP_MS > 0) {
        await sleep(REQUEST_SLEEP_MS);
      }
    } catch (err) {
      console.error(
        `Failed geocode for entity_address_id=${row.id}:`,
        err,
      );
    }
  }

  return { successCount, skipCount, total: rows.length };
}

async function main() {
  console.log("Geocode nonprofit addresses", {
    LIMIT,
    START_OFFSET,
    RUN_ONCE,
    STOP_AFTER_ZERO_BATCHES,
    MAX_BATCHES,
    SLEEP_MS,
    REQUEST_SLEEP_MS,
    DRY_RUN,
    PROVIDER,
  });

  let offset = START_OFFSET;
  let zeroProgressStreak = 0;
  const batchesToRun = RUN_ONCE ? 1 : MAX_BATCHES;

  for (let batch = 0; batch < batchesToRun; batch++) {
    console.log({ batch: batch + 1, LIMIT, OFFSET: offset });

    const { successCount, skipCount, total } = await runBatch(offset);
    console.log(
      `Batch result: total=${total}, success=${successCount}, skipped=${skipCount}`,
    );

    if (successCount <= 0) {
      zeroProgressStreak++;
    } else {
      zeroProgressStreak = 0;
    }

    offset += LIMIT;

    if (!RUN_ONCE && zeroProgressStreak >= STOP_AFTER_ZERO_BATCHES) {
      console.log(
        `Stopping: ${zeroProgressStreak} consecutive batches with 0 progress.`,
      );
      break;
    }

    if (RUN_ONCE) break;

    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }

  if (!RUN_ONCE && MAX_BATCHES > 0) {
    console.log("Done.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
