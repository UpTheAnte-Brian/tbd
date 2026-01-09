import "server-only";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { resolveDistrictEntityId } from "@/app/lib/entities";
import {
  DistrictDetails,
  EntityUser,
  EntityUserRole,
} from "@/app/lib/types/types";

export async function getDistrictDTO(id: string): Promise<DistrictDetails> {
  const supabase = await createClient();
  const entityId = await resolveDistrictEntityId(supabase, id);

  const selectClause =
    "id, sdorgid, shortname, status, properties, centroid_lat, centroid_lng";

  const { data: districtByEntity, error: districtByEntityError } =
    await supabase
      .from("districts")
      .select(selectClause)
      .eq("entity_id", entityId)
      .maybeSingle();

  if (districtByEntityError) {
    throw districtByEntityError;
  }

  const { data: districtById, error: districtByIdError } =
    districtByEntity
      ? { data: null, error: null }
      : await supabase
          .from("districts")
          .select(selectClause)
          .eq("id", id)
          .maybeSingle();

  if (districtByIdError) {
    throw districtByIdError;
  }

  const { data: districtBySdorgid, error: districtBySdorgidError } =
    districtByEntity || districtById
      ? { data: null, error: null }
      : await supabase
          .from("districts")
          .select(selectClause)
          .eq("sdorgid", id)
          .maybeSingle();

  if (districtBySdorgidError) {
    throw districtBySdorgidError;
  }

  const district = districtByEntity ?? districtById ?? districtBySdorgid;

  if (!district) {
    throw new Error("District not found");
  }

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

  return {
    id: district.id,
    entity_id: entityId,
    sdorgid: district.sdorgid,
    shortname: district.shortname ?? null,
    prefname: asString(props.prefname, district.shortname) ?? null,
    sdnumber: asString(props.sdnumber, "") ?? null,
    web_url: asString(props.web_url, "") ?? null,
    acres: asNumber(props.acres),
    formid: asString(props.formid, null),
    sdtype: asString(props.sdtype, null),
    sqmiles: asNumber(props.sqmiles),
    shape_area: asNumber(props.shape_area),
    shape_leng: asNumber(props.shape_leng),
    centroid_lat: district.centroid_lat ?? null,
    centroid_lng: district.centroid_lng ?? null,
    status: district.status ?? null,
    users: mappedUsers,
  };
}

export const getDistrictDTOCached = cache(async (id: string) =>
  getDistrictDTO(id)
);
