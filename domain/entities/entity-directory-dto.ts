import "server-only";

import type { EntityDirectoryRow } from "@/app/lib/types/entity-directory";
import type { EntityType } from "@/domain/entities/types";
import { createApiClient } from "@/utils/supabase/route";
import type { Database } from "@/database.types";
import { getBusinesses } from "@/domain/businesses/businesses-dto";
import { listNonprofitDTO } from "@/domain/nonprofits/nonprofit-dto";

type DistrictMetadataRow =
  Database["public"]["Tables"]["district_metadata"]["Row"];

type DistrictEntityRow = Pick<
  Database["public"]["Tables"]["entities"]["Row"],
  "id" | "name" | "entity_type" | "external_ids" | "slug"
> & {
  district_metadata?: DistrictMetadataRow | DistrictMetadataRow[] | null;
};

function asString(value: unknown, fallback: string | null = null): string | null {
  return typeof value === "string" ? value : fallback;
}

function normalizeExternalIds(
  externalIds: Record<string, unknown> | null,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(externalIds ?? {}).map(([key, val]) => [
      key.toLowerCase(),
      val,
    ]),
  ) as Record<string, unknown>;
}

async function listDistrictDirectoryRows(): Promise<EntityDirectoryRow[]> {
  const supabase = await createApiClient();
  const { data, error } = await supabase
    .from("entities")
    .select(
      `
      id,
      name,
      slug,
      entity_type,
      external_ids,
      district_metadata (
        web_url,
        sdorgid,
        shortname,
        prefname,
        sdnumber
      )
    `,
    )
    .eq("entity_type", "district")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as DistrictEntityRow[];
  return rows.map((row) => {
    const metadata = Array.isArray(row.district_metadata)
      ? row.district_metadata[0]
      : row.district_metadata ?? null;
    const externalIds = normalizeExternalIds(
      (row.external_ids as Record<string, unknown> | null) ?? null,
    );
    const name =
      asString(metadata?.prefname, null) ?? row.name ?? "District";
    const shortName =
      asString(metadata?.shortname, null) ??
      asString(externalIds.shortname, null);
    const districtNumber =
      asString(metadata?.sdnumber, null) ??
      asString(externalIds.sdnumber, null);
    const website =
      asString(metadata?.web_url, null) ??
      asString(externalIds.web_url, null);

    return {
      entity_id: String(row.id),
      name,
      short_name: shortName,
      entity_type: "district",
      city: null,
      state: null,
      website,
      district_number: districtNumber,
    };
  });
}

async function listBusinessDirectoryRows(): Promise<EntityDirectoryRow[]> {
  const businesses = await getBusinesses();
  return businesses
    .filter((business) => Boolean(business.entity_id))
    .map((business) => ({
      entity_id: String(business.entity_id),
      name: business.name,
      short_name: null,
      entity_type: "business",
      city: null,
      state: null,
      website: business.website ?? null,
      district_number: null,
    }));
}

async function listNonprofitDirectoryRows(): Promise<EntityDirectoryRow[]> {
  const nonprofits = await listNonprofitDTO();
  return nonprofits
    .filter((np) => Boolean(np.entity_id))
    .map((np) => ({
      entity_id: String(np.entity_id),
      name: np.name,
      short_name: null,
      entity_type: "nonprofit",
      city: null,
      state: null,
      website: np.website_url ?? null,
      district_number: null,
    }));
}

export async function listEntityDirectoryRows(
  types?: EntityType[],
): Promise<EntityDirectoryRow[]> {
  const includeAll = !types || types.length === 0;
  const shouldInclude = (type: EntityType) =>
    includeAll || types.includes(type);

  const results: EntityDirectoryRow[] = [];

  if (shouldInclude("district")) {
    results.push(...(await listDistrictDirectoryRows()));
  }
  if (shouldInclude("business")) {
    results.push(...(await listBusinessDirectoryRows()));
  }
  if (shouldInclude("nonprofit")) {
    results.push(...(await listNonprofitDirectoryRows()));
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}
