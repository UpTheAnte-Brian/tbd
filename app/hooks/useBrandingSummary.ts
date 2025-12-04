"use client";

import { useEffect, useState } from "react";

type BrandingSummary = {
    logos: unknown[];
    patterns: unknown[];
    fonts: unknown[];
    palettes: unknown[];
    typography: unknown[];
};

export function useBrandingSummary(districtId: string | null) {
    const [data, setData] = useState<BrandingSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!districtId) return;
        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `/api/districts/${districtId}/branding/summary`,
                );
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || `Failed to load summary`);
                }
                const json = await res.json();
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
    }, [districtId]);

    return { data, loading, error } as const;
}
