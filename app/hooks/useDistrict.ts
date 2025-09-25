// app/hooks/useUser.ts
"use client";

import { DistrictWithFoundation } from "@/app/lib/types";
import { useEffect, useState } from "react";

export function useDistrict(id: string) {
    const [district, setDistrict] = useState<DistrictWithFoundation | null>(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!id) {
            setDistrict(null);
            setError(null);
            setLoading(false);
            return;
        }

        const loadDistrict = async () => {
            setLoading(true);
            setError(null);
            try {
                // call your secure API route
                const res = await fetch(`/api/districts/${id}`);
                // 👆 you can make a convenience alias route that resolves `id` using getUser() server-side
                // or, if you only have /[id], first call supabase.auth.getUser() to get id client-side

                if (!res.ok) {
                    throw new Error(`Failed to load district: ${res.status}`);
                }

                const data = await res.json();

                setDistrict(data);
            } catch (err) {
                console.error(err);
                setDistrict(null);
                setError(
                    err instanceof Error ? err : new Error("Unknown error"),
                );
            } finally {
                setLoading(false);
            }
        };

        loadDistrict();
        return () => {};
    }, []);

    return { district, loading, error };
}
