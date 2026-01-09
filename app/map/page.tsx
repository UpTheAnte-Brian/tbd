import { headers } from "next/headers";
import EntityMapExplorer from "@/app/components/map/entity-map-explorer";
import type { EntityFeatureCollection } from "@/app/lib/types/map";

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
  let data: MapHomeResponse | null = null;
  let error: string | null = null;
  try {
    data = await getHomeMapData();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load states map";
  }
  const featureCollection: EntityFeatureCollection = data?.featureCollection ?? {
    type: "FeatureCollection",
    features: [],
  };
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <EntityMapExplorer
        initialStates={featureCollection}
        homeStatus={{
          loading: false,
          error,
          featureCount: featureCollection.features.length,
        }}
      />
    </div>
  );
}
