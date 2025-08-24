// app/hooks/useUserById.ts
"use client";

import { Profile } from "@/app/lib/types";
import { useEffect, useState } from "react";

export function useUserById(id?: string) {
    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setUser(null);
            setError(null);
            setLoading(false);
            return;
        }

        let ignore = false;

        const loadUser = async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch(`/api/users/${id}`);
                if (!res.ok) {
                    if (res.status === 404) {
                        throw new Error("User not found");
                    }
                    throw new Error("Failed to load user");
                }

                const data = await res.json();
                if (!ignore) {
                    setUser(data);
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                if (!ignore) {
                    setUser(null);
                    setError(err.message ?? "Unknown error");
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        loadUser();

        return () => {
            ignore = true;
        };
    }, [id]);

    return { user, loading, error };
}
