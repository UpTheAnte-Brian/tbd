// app/hooks/useUserById.ts
"use client";

import { Business } from "@/app/lib/types";
import { useCallback, useEffect, useState } from "react";

export function useBusiness(id?: string) {
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadBusiness = useCallback(async () => {
        if (!id) {
            setBusiness(null);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/businesses/${id}`);
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error("Business not found");
                }
                throw new Error("Failed to load business");
            }

            const data = await res.json();
            setBusiness(data);
        } catch (err) {
            console.error(err);
            setBusiness(null);
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadBusiness();
        return () => {};
    }, [loadBusiness]);

    return { business, loading, error, reload: loadBusiness };
}
