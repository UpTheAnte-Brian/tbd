"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/database.types";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient<Database>>;

let browserClient: BrowserSupabaseClient | null = null;

/**
 * Returns a singleton Supabase browser client.
 * This must ONLY be used in client components.
 */
export function getSupabaseClient(): BrowserSupabaseClient {
    if (!browserClient) {
        browserClient = createBrowserClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
    }

    return browserClient!;
}
