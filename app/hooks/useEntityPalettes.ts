"use client";

import { useEffect, useState } from "react";
import type { BrandingPalette } from "@/app/lib/types/types";

export function useEntityPalettes(entityId: string | null, refreshKey = 0) {
  const [palettes, setPalettes] = useState<BrandingPalette[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;

    const fetchPalettes = async () => {
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
        const data = (await res.json()) as { palettes?: BrandingPalette[] };
        if (!cancelled) {
          setPalettes(data.palettes ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error");
          setPalettes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPalettes();
    return () => {
      cancelled = true;
    };
  }, [entityId, refreshKey]);

  return { palettes, loading, error } as const;
}
