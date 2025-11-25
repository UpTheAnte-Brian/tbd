"use client";

import { useCallback, useEffect, useState } from "react";
import { NonprofitDTO } from "@/app/data/nonprofit-dto";

export function useNonprofit(id: string) {
    const [nonprofit, setNonprofit] = useState<NonprofitDTO | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNonprofit = useCallback(async () => {
        if (!id) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/nonprofits/${id}`, {
                method: "GET",
            });
            if (!response.ok) {
                throw new Error("Failed to load nonprofit");
            }

            const json: NonprofitDTO = await response.json();
            setNonprofit(json);
        } catch (err: unknown) {
            console.error("Error loading nonprofit:", err);
            setError(err instanceof Error ? err.message : "Unknown error");
            setNonprofit(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchNonprofit();
    }, [fetchNonprofit]);

    return {
        nonprofit,
        loading,
        error,
        reload: fetchNonprofit,
    };
}
