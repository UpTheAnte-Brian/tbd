"use client";

import { useEffect, useState } from "react";
import EntityMapShell from "@/app/components/maps/entity-map-shell";
import type { EntityFeatureCollection } from "@/app/lib/types/map";
import type { EntityType } from "@/app/lib/types/types";

type Props = {
  entityId: string;
  entityType: EntityType;
};

const emptyCollection: EntityFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export default function EntityMapTab({ entityId, entityType }: Props) {
  const [featureCollection, setFeatureCollection] =
    useState<EntityFeatureCollection>(emptyCollection);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMap = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/entities/${entityId}/map?geometry_type=boundary_simplified`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load map layer");
        }
        const json = (await res.json()) as EntityFeatureCollection;
        if (!cancelled) {
          setFeatureCollection(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error");
          setFeatureCollection(emptyCollection);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMap();
    return () => {
      cancelled = true;
    };
  }, [entityId]);

  if (loading) {
    return (
      <div className="rounded border border-dashed p-4 text-sm text-gray-500">
        Loading map…
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!featureCollection.features.length) {
    return (
      <div className="rounded border border-dashed p-4 text-sm text-gray-500">
        No map geometry available for this {entityType}.
      </div>
    );
  }

  return <EntityMapShell featureCollection={featureCollection} />;
}
