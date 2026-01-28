import "server-only";

import { supabaseAdmin } from "@/utils/supabase/service-worker";

export type AdminEntityCount = {
  key: string;
  label: string;
  count: number;
};

export type AdminSummary = {
  generatedAt: string;
  entityCounts: AdminEntityCount[];
  totalEntities: number;
  geometry: {
    boundarySimplified: number;
    point: number;
    missingBoundarySimplified: number;
    missingPoint: number;
  };
  staleness: {
    cutoffDays: number;
    staleSourceRecords: number;
    totalSourceRecords: number;
  };
  jobs: {
    configured: boolean;
    failuresLast7Days?: number;
    lastRunAt?: string | null;
  };
  errors: string[];
};

type CountResult = {
  count: number | null;
  error: string | null;
};

const DEFAULT_ENTITY_TYPES: Array<{ key: string; label: string }> = [
  { key: "district", label: "Districts" },
  { key: "nonprofit", label: "Nonprofits" },
  { key: "business", label: "Businesses" },
  { key: "place", label: "Places" },
  { key: "city", label: "Cities" },
  { key: "county", label: "Counties" },
  { key: "state", label: "States" },
];

const toLabel = (value: string): string =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const readStaleDays = (): number => {
  const raw = process.env.ADMIN_STALE_DAYS;
  if (!raw) return 30;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
};

const countOrError = async (
  label: string,
  query: () => PromiseLike<
    { count: number | null; error: { message: string } | null }
  >,
  errors: string[],
): Promise<CountResult> => {
  const { count, error } = await query();
  if (error) {
    errors.push(`${label}: ${error.message}`);
    return { count: null, error: error.message };
  }
  return { count: count ?? 0, error: null };
};

export async function getAdminSummary(): Promise<AdminSummary> {
  const errors: string[] = [];
  const generatedAt = new Date().toISOString();
  const cutoffDays = readStaleDays();
  const cutoffDate = new Date(
    Date.now() - cutoffDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: entityTypes, error: entityTypesError } = await supabaseAdmin
    .from("entity_types")
    .select("key, label, active")
    .eq("active", true)
    .order("label", { ascending: true });

  if (entityTypesError) {
    errors.push(`entity_types: ${entityTypesError.message}`);
  }

  const resolvedEntityTypes = entityTypes && entityTypes.length
    ? entityTypes.map((row) => ({
      key: row.key,
      label: row.label ?? toLabel(row.key),
    }))
    : DEFAULT_ENTITY_TYPES;

  const entityCounts = await Promise.all(
    resolvedEntityTypes.map(async (type) => {
      const { count } = await countOrError(
        `entities.${type.key}`,
        () =>
          supabaseAdmin
            .from("entities")
            .select("id", { count: "exact", head: true })
            .eq("entity_type", type.key),
        errors,
      );

      return {
        key: type.key,
        label: type.label,
        count: count ?? 0,
      };
    }),
  );

  const totalCountResult = await countOrError(
    "entities.total",
    () =>
      supabaseAdmin
        .from("entities")
        .select("id", { count: "exact", head: true }),
    errors,
  );

  const totalEntities = totalCountResult.count ??
    entityCounts.reduce((sum, row) => sum + row.count, 0);

  const boundarySimplifiedResult = await countOrError(
    "entity_geometries.boundary_simplified",
    () =>
      supabaseAdmin
        .from("entity_geometries")
        .select("id", { count: "exact", head: true })
        .eq("geometry_type", "boundary_simplified"),
    errors,
  );

  const pointResult = await countOrError(
    "entity_geometries.point",
    () =>
      supabaseAdmin
        .from("entity_geometries")
        .select("id", { count: "exact", head: true })
        .eq("geometry_type", "point"),
    errors,
  );

  const totalSourceRecordsResult = await countOrError(
    "entity_source_records.total",
    () =>
      supabaseAdmin
        .from("entity_source_records")
        .select("entity_id", { count: "exact", head: true }),
    errors,
  );

  const staleSourceRecordsResult = await countOrError(
    "entity_source_records.stale",
    () =>
      supabaseAdmin
        .from("entity_source_records")
        .select("entity_id", { count: "exact", head: true })
        .lt("fetched_at", cutoffDate),
    errors,
  );

  const boundarySimplified = boundarySimplifiedResult.count ?? 0;
  const point = pointResult.count ?? 0;
  const missingBoundarySimplified = Math.max(
    totalEntities - boundarySimplified,
    0,
  );
  const missingPoint = Math.max(totalEntities - point, 0);

  return {
    generatedAt,
    entityCounts,
    totalEntities,
    geometry: {
      boundarySimplified,
      point,
      missingBoundarySimplified,
      missingPoint,
    },
    staleness: {
      cutoffDays,
      staleSourceRecords: staleSourceRecordsResult.count ?? 0,
      totalSourceRecords: totalSourceRecordsResult.count ?? 0,
    },
    jobs: {
      configured: false,
    },
    errors,
  };
}
