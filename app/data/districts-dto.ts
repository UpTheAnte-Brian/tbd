import "server-only";
import { createClient } from "@/utils/supabase/server";
import { DistrictUserJoined } from "@/app/lib/types";

export async function getDistrictDTO(id: string) {
  const supabase = await createClient();

  // Fetch the district
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

  // Parse properties
  const rawProps = typeof district.properties === "string"
    ? JSON.parse(district.properties)
    : district.properties;

  const props = Object.fromEntries(
    Object.entries(rawProps).map(([k, v]) => [k.toLowerCase(), v]),
  );

  // Optionally fetch related users
  const { data: users } = await supabase
    .from("district_users")
    .select("*, user:profiles(*), district:districts(*)")
    .eq("district_id", district.id);

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
    users: users as DistrictUserJoined[] | undefined,
  };

  return feature;
}
