import "server-only";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import {
  DistrictFeature,
  EntityUser,
  EntityUserRole,
} from "@/app/lib/types/types";

export async function getDistrictDTO(id: string): Promise<DistrictFeature> {
  const supabase = await createClient();

  const { data: byId, error: byIdError } = await supabase
    .from("districts")
    .select(
      "id, sdorgid, shortname, properties, geometry_simplified, centroid_lat, centroid_lng, entity_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (byIdError) {
    throw byIdError;
  }

  const { data: bySdorgid, error: bySdorgidError } = byId
    ? { data: null, error: null }
    : await supabase
      .from("districts")
      .select(
        "id, sdorgid, shortname, properties, geometry_simplified, centroid_lat, centroid_lng, entity_id",
      )
      .eq("sdorgid", id)
      .maybeSingle();

  if (bySdorgidError) {
    throw bySdorgidError;
  }

  const district = byId ?? bySdorgid;

  if (!district) {
    throw new Error("District not found");
  }

  const resolveEntityId = async (): Promise<string> => {
    const { data: bySdorgid, error: bySdorgidError } = await supabase
      .from("entities")
      .select("id")
      .eq("entity_type", "district")
      .eq("external_ids->>sdorgid", district.sdorgid)
      .maybeSingle();
    if (bySdorgidError) {
      throw bySdorgidError;
    }
    if (bySdorgid?.id) return bySdorgid.id;

    const { data: byDistrictId, error: byDistrictIdError } = await supabase
      .from("entities")
      .select("id")
      .eq("entity_type", "district")
      .eq("external_ids->>district_id", district.id)
      .maybeSingle();
    if (byDistrictIdError) {
      throw byDistrictIdError;
    }
    if (byDistrictId?.id) return byDistrictId.id;

    throw new Error(`Entity not found for district ${district.sdorgid}`);
  };

  const entityId = district.entity_id ?? await resolveEntityId();

  const { data: users } = await supabase
    .from("entity_users")
    .select(
      `
      id,
      entity_id,
      user_id,
      role,
      status,
      created_at,
      entities:entities (
        entity_type
      ),
      profile:profiles ( id, full_name, username, first_name, last_name, avatar_url, website )
    `,
    )
    .eq("entity_id", entityId);

  const mappedUsers = (users ?? []).map((u) => {
    const profileRaw = Array.isArray(u.profile) ? u.profile[0] : u.profile;
    const entity =
      Array.isArray(u.entities) ? u.entities[0] : u.entities;
    return {
      id: String(u.id),
      entity_type: entity?.entity_type ?? "district",
      entity_id: String(u.entity_id),
      user_id: String(u.user_id),
      role: (u.role as EntityUserRole) ?? "viewer",
      status: (u.status as EntityUser["status"]) ?? null,
      created_at: u.created_at ?? null,
      updated_at: null,
      profile: profileRaw
        ? {
          id: String((profileRaw as { id: string }).id ?? ""),
          full_name: (profileRaw as { full_name?: string | null }).full_name ??
            null,
          username: (profileRaw as { username?: string | null }).username ??
            null,
          first_name:
            (profileRaw as { first_name?: string | null }).first_name ?? null,
          last_name: (profileRaw as { last_name?: string | null }).last_name ??
            null,
          avatar_url:
            (profileRaw as { avatar_url?: string | null }).avatar_url ?? null,
          website: (profileRaw as { website?: string | null }).website ?? null,
          entity_users: undefined,
        }
        : null,
    };
  }) ?? [];

  const rawProps = (() => {
    if (!district.properties) return {};
    if (typeof district.properties === "string") {
      try {
        return JSON.parse(district.properties);
      } catch {
        return {};
      }
    }
    return district.properties ?? {};
  })() as Record<string, unknown>;
  const props = Object.fromEntries(
    Object.entries(rawProps).map(([k, v]) => [k.toLowerCase(), v]),
  ) as Record<string, unknown>;

  const asNumber = (val: unknown): number | null => {
    if (val === null || val === undefined || val === "") return null;
    const num = Number(val);
    return Number.isFinite(num) ? num : null;
  };

  const asString = (
    val: unknown,
    fallback: string | null = "",
  ): string | null => (typeof val === "string" ? val : fallback);

  const baseProps: DistrictFeature["properties"] = {
    district_id: district.id,
    sdorgid: district.sdorgid,
    shortname: district.shortname,
    prefname: asString(props.prefname, district.shortname) ?? "",
    sdnumber: asString(props.sdnumber, "") ?? "",
    web_url: asString(props.web_url, "") ?? "",
    acres: asNumber(props.acres),
    formid: asString(props.formid, null),
    sdtype: asString(props.sdtype, null),
    sqmiles: asNumber(props.sqmiles),
    shape_area: asNumber(props.shape_area),
    shape_leng: asNumber(props.shape_leng),
    centroid_lat: district.centroid_lat,
    centroid_lng: district.centroid_lng,
  };

  const feature: DistrictFeature = {
    type: "Feature",
    id: district.id,
    entity_id: entityId,
    properties: baseProps,
    geometry: district.geometry_simplified,
    users: mappedUsers,
  };

  return feature;
}

export const getDistrictDTOCached = cache(async (id: string) =>
  getDistrictDTO(id)
);
