import "server-only";

import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EntityOverviewDTO = {
  id: string;
  name: string | null;
  website: string | null;
  entity_type: string | null;
  created_at: string | null;
  has_irs_link: boolean;
  eins: string[];
};

type EntityOverviewRow = {
  id: string;
  name: string | null;
  entity_type: string | null;
  created_at: string | null;
  district_metadata?:
    | { web_url: string | null }
    | { web_url: string | null }[]
    | null;
  nonprofits?:
    | { website_url: string | null }
    | { website_url: string | null }[]
    | null;
  businesses?:
    | { website: string | null }
    | { website: string | null }[]
    | null;
};

function takeFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function normalizeWebsite(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getEntityDTO(
  entityId: string
): Promise<EntityOverviewDTO> {
  const supabase = (await createApiClient()) as SupabaseClient;

  const resolvedId = await resolveEntityId(supabase, entityId);
  const { data: irsLinks, error: irsLinkErr } = await supabase
    .schema("irs")
    .from("entity_links")
    .select("ein")
    .eq("entity_id", resolvedId);

  if (irsLinkErr) {
    throw new Error(irsLinkErr.message);
  }

  const eins = (irsLinks ?? [])
    .map((row) => row?.ein)
    .filter((value): value is string => typeof value === "string")
    .filter((value) => value.trim().length > 0);

  const uniqueEins = Array.from(new Set(eins));
  const { data, error } = await supabase
    .from("entities")
    .select(
      `
      id,
      name,
      entity_type,
      created_at,
      district_metadata ( web_url ),
      nonprofits ( website_url ),
      businesses ( website )
    `
    )
    .eq("id", resolvedId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Entity not found");
  }

  const row = data as EntityOverviewRow;
  const districtMeta = takeFirst(row.district_metadata);
  const nonprofit = takeFirst(row.nonprofits);
  const business = takeFirst(row.businesses);

  const entityType = row.entity_type ?? null;
  let website =
    entityType === "district"
      ? normalizeWebsite(districtMeta?.web_url)
      : entityType === "nonprofit"
        ? normalizeWebsite(nonprofit?.website_url)
        : entityType === "business"
          ? normalizeWebsite(business?.website)
          : null;

  if (!website) {
    website =
      normalizeWebsite(districtMeta?.web_url) ??
      normalizeWebsite(nonprofit?.website_url) ??
      normalizeWebsite(business?.website) ??
      null;
  }

  return {
    id: String(row.id),
    name: row.name ?? null,
    website,
    entity_type: entityType,
    created_at: row.created_at ?? null,
    has_irs_link: uniqueEins.length > 0,
    eins: uniqueEins,
  };
}
