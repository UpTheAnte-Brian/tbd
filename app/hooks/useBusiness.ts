// app/hooks/useUserById.ts
"use client";

import { Business } from "@/app/lib/types";
import { useEffect, useState } from "react";

export function useBusiness(id?: string) {
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setBusiness(null);
            setError(null);
            setLoading(false);
            return;
        }

        let ignore = false;

        const loadBusiness = async () => {
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
                console.log("useBusiness Data: ", data);
                if (!ignore) {
                    setBusiness(data);
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                if (!ignore) {
                    setBusiness(null);
                    setError(err.message ?? "Unknown error");
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        loadBusiness();

        return () => {
            ignore = true;
        };
    }, [id]);

    return { business, loading, error };
}
