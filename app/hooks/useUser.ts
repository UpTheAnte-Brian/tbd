// app/hooks/useUser.ts
"use client";

import { Profile } from "@/app/lib/types";
import { useEffect, useState } from "react";

export function useUser() {
    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let ignore = false;

        const loadUser = async () => {
            setLoading(true);
            setError(null);
            try {
                // call your secure API route
                const res = await fetch("/api/users/me");
                // 👆 you can make a convenience alias route that resolves `id` using getUser() server-side
                // or, if you only have /[id], first call supabase.auth.getUser() to get id client-side

                if (!res.ok) {
                    throw new Error(`Failed to load user: ${res.status}`);
                }

                const data = await res.json();
                if (!ignore) {
                    setUser(data);
                }
            } catch (err) {
                console.error(err);
                if (!ignore) {
                    setUser(null);
                    setError(
                        err instanceof Error ? err : new Error("Unknown error"),
                    );
                }
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        loadUser();
        return () => {
            ignore = true;
        };
    }, []);

    return { user, loading, error };
}
