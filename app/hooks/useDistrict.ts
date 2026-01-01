// app/hooks/useUser.ts
"use client";

import { DistrictDetails } from "@/app/lib/types/types";
import { useCallback, useEffect, useState } from "react";

export function useDistrict(id: string) {
    const [district, setDistrict] = useState<DistrictDetails | null>(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadDistrict = useCallback(async () => {
        if (!id) {
            setDistrict(null);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/districts/${id}`);
            if (!res.ok) {
                throw new Error(`Failed to load district: ${res.status}`);
            }

            const data = await res.json();
            setDistrict(data);
        } catch (err) {
            console.error(err);
            setDistrict(null);
            setError(err instanceof Error ? err : new Error("Unknown error"));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadDistrict();
        return () => {};
    }, [loadDistrict]);

    return { district, loading, error, reload: loadDistrict };
}
