import "server-only";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { EntityUser, EntityUserRole } from "@/app/lib/types/types";

export async function getDistrictDTO(id: string) {
  const supabase = await createClient();

  const { data: district, error: districtError } = await supabase
    .from("districts")
    .select(
      "id, sdorgid, shortname, properties, geometry_simplified, centroid_lat, centroid_lng, district_metadata(logo_path)",
    )
    .eq("sdorgid", id)
    .maybeSingle();

  if (districtError || !district) {
    throw new Error("District not found");
  }

  const rawProps = typeof district.properties === "string"
    ? JSON.parse(district.properties)
    : district.properties;

  const props = Object.fromEntries(
    Object.entries(rawProps).map(([k, v]) => [k.toLowerCase(), v]),
  );

  const { data: users } = await supabase
    .from("entity_users")
    .select(
      `
      id,
      entity_type,
      entity_id,
      user_id,
      role,
      status,
      created_at,
      profile:profiles ( id, full_name, username, first_name, last_name, avatar_url, website )
    `,
    )
    .eq("entity_type", "district")
    .eq("entity_id", district.id);

  const mappedUsers = (users ?? []).map((u) => {
    const profileRaw = Array.isArray(u.profile) ? u.profile[0] : u.profile;
    return {
      id: String(u.id),
      entity_type: "district" as const,
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

  const feature = {
    type: "Feature",
    id: district.id,
    sdorgid: district.sdorgid,
    shortname: district.shortname,
    centroid_lat: district.centroid_lat,
    centroid_lng: district.centroid_lng,
    properties: {
      sdorgid: district.sdorgid,
      centroid_lat: district.centroid_lat,
      centroid_lng: district.centroid_lng,
      ...props,
    },
    geometry: district.geometry_simplified,
    metadata: district.district_metadata,
    users: mappedUsers,
  };

  return feature;
}

export const getDistrictDTOCached = cache(async (id: string) =>
  getDistrictDTO(id)
);
