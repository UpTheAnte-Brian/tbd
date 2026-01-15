"use client";

import { useEffect, useState } from "react";
import { createCachedResource } from "@/app/lib/fetch/createCachedResource";
import type { BrandingSummary } from "@/app/lib/types/types";

export type EntityBrandingResponse = BrandingSummary;

const BRANDING_CACHE_TTL_MS = 5 * 60_000;

const brandingResource = createCachedResource<string, EntityBrandingResponse>(
  (entityId) => entityId,
  { cacheTTLms: BRANDING_CACHE_TTL_MS }
);

export const clearEntityBrandingCache = (entityId?: string | null) => {
  if (!entityId) {
    brandingResource.clear();
    return;
  }
  brandingResource.clear(entityId);
};

export function useEntityBranding(entityId: string | null, refreshKey = 0) {
  const [data, setData] = useState<EntityBrandingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const json = await brandingResource.get(
          entityId,
          async () => {
            const res = await fetch(`/api/entities/${entityId}/branding`, {
              cache: "no-store",
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body.error || "Failed to load branding");
            }
            return (await res.json()) as EntityBrandingResponse;
          },
          { force: refreshKey !== 0 }
        );
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [entityId, refreshKey]);

  return { data, loading, error } as const;
}
