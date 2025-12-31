"use client";

import { useEffect, useState } from "react";
import type {
  BrandColorTokens,
  BrandTypographyTokens,
} from "@/app/lib/branding/resolveBranding";
import type {
  BrandingPalette,
  BrandingTypography,
} from "@/app/lib/types/types";
import type { BrandingAssetRow } from "@/app/data/entity-branding";

export type EntityBrandingResponse = {
  entityId: string;
  tokens: {
    colors: BrandColorTokens;
    typography: BrandTypographyTokens;
  };
  palettes: BrandingPalette[];
  typography: BrandingTypography[];
  assets: BrandingAssetRow[];
  primaryLogoAsset: BrandingAssetRow | null;
};

const brandingCache = new Map<string, EntityBrandingResponse>();

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
        const res = await fetch(`/api/entities/${entityId}/branding`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load branding");
        }
        const json = (await res.json()) as EntityBrandingResponse;
        if (!cancelled) {
          brandingCache.set(entityId, json);
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
