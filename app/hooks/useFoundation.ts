// app/hooks/useUserById.ts
"use client";

import { Foundation } from "@/app/lib/types/types";
import { useEffect, useState } from "react";

export function useFoundation(district_sdorgid?: string) {
    const [foundation, setFoundation] = useState<Foundation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    let ignore = false;

    const loadFoundation = async () => {
        if (!district_sdorgid) {
            setFoundation(null);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/foundations/${district_sdorgid}`);
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error("Foundation not found");
                }
                throw new Error("Failed to load foundation");
            }

            const data = await res.json();

            if (!ignore) {
                setFoundation(data);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            if (!ignore) {
                setFoundation(null);
                setError(err.message ?? "Unknown error");
            }
        } finally {
            if (!ignore) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        ignore = false;
        loadFoundation();

        return () => {
            ignore = true;
        };
    }, [district_sdorgid]);

    return { foundation, loading, error, reload: loadFoundation };
}
