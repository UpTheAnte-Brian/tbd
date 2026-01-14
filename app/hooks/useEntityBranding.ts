"use client";

import { useEffect, useState } from "react";
import type { BrandingSummary } from "@/app/lib/types/types";

export type EntityBrandingResponse = BrandingSummary;

const brandingCache = new Map<string, EntityBrandingResponse>();
const brandingRequests = new Map<string, Promise<EntityBrandingResponse>>();

export function useEntityBranding(entityId: string | null, refreshKey = 0) {
  const [data, setData] = useState<EntityBrandingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;

    if (refreshKey === 0 && brandingCache.has(entityId)) {
      setData(brandingCache.get(entityId) ?? null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let pending = brandingRequests.get(entityId);
        if (!pending || refreshKey !== 0) {
          pending = (async () => {
            const cacheBuster = refreshKey > 0 ? `?t=${refreshKey}` : "";
            const res = await fetch(`/api/entities/${entityId}/branding${cacheBuster}`, {
              cache: "no-store",
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body.error || "Failed to load branding");
            }
            console.log("palettes: ", res);
            return (await res.json()) as EntityBrandingResponse;
          })();
          brandingRequests.set(entityId, pending);
        }

        const json = await pending;
        brandingRequests.delete(entityId);
        brandingCache.set(entityId, json);
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        brandingRequests.delete(entityId);
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
