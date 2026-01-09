import { headers } from "next/headers";
import EntityMapExplorer from "@/app/components/map/entity-map-explorer";
import type { EntityFeatureCollection } from "@/app/lib/types/map";
import { createClient } from "@/utils/supabase/server";

type MapHomeResponse = {
  level: "states";
  featureCollection: EntityFeatureCollection;
};

export const revalidate = 86400;

async function getHomeMapData(): Promise<MapHomeResponse> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_HOST ?? // TODO: remove NEXT_PUBLIC_HOST fallback after migration
    `http://${(await headers()).get("host")}`;
  const res = await fetch(`${baseUrl}/api/map/home`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    throw new Error("Failed to load states map");
  }
  return res.json();
}

export default async function Page() {
  const supabase = await createClient();

  // Home page is public. If a session exists, we'll have a user; if not, continue anonymously.
  // We only throw on unexpected errors (NOT on missing session).
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    const normalized = authError.message?.toLowerCase() ?? "";
    // Missing session is normal for public pages.
    if (!normalized.includes("auth session missing")) {
      throw new Error(`auth.getUser failed: ${authError.message}`);
    }
  }

  // Currently unused, but kept here for future personalization.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const user = authData?.user ?? null;

  let mapData: MapHomeResponse | null = null;
  let mapError: string | null = null;
  try {
    mapData = await getHomeMapData();
  } catch (err) {
    mapError = err instanceof Error ? err.message : "Failed to load states map";
  }
  const featureCollection: EntityFeatureCollection =
    mapData?.featureCollection ?? {
      type: "FeatureCollection",
      features: [],
    };
  return (
    <EntityMapExplorer
      initialStates={featureCollection}
      homeStatus={{
        loading: false,
        error: mapError,
        featureCount: featureCollection.features.length,
      }}
    />
  );
}
