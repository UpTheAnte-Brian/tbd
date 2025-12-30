"use client";

import { useEffect, useState } from "react";
import type { BrandingSummary } from "@/app/lib/types/types";

// simple in-memory cache per district
const summaryCache = new Map<string, BrandingSummary>();

export function useBrandingSummary(
    entityId: string | null,
    refreshKey: number = 0,
) {
    const [data, setData] = useState<BrandingSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!entityId) return;
        let cancelled = false;

        // serve from cache unless a refresh is explicitly requested
        if (refreshKey === 0 && entityId && summaryCache.has(entityId)) {
            setData(summaryCache.get(entityId) ?? null);
            setLoading(false);
            return () => {
                cancelled = true;
            };
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `/api/districts/${entityId}/branding/summary`,
                    { cache: "no-store" },
                );
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || `Failed to load summary`);
                }
                const json = await res.json();
                if (!cancelled) {
                    summaryCache.set(entityId, json);
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
