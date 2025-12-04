"use client";

import { useQuery } from "@tanstack/react-query";
import { Business } from "@/app/lib/types/types";

export function useClaimedBusinesses(userId?: string) {
    return useQuery<Business[]>({
        queryKey: ["claimedBusinesses", userId],
        queryFn: async () => {
            if (!userId) return [];
            const res = await fetch("/api/businesses/claimed");
            if (!res.ok) throw new Error("Failed to fetch claimed businesses");
            return res.json();
        },
        enabled: !!userId, // only runs when user is logged in
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
