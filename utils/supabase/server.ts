import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/database.types";

export async function createClient(): Promise<SupabaseClient<Database>> {
    const cookieStore = await cookies();

    // Next.js typings can represent `cookies()` differently depending on runtime.
    // We only rely on `getAll()` and `set()` here.
    const cookieStoreRW = cookieStore as unknown as {
        getAll: () => Array<{ name: string; value: string }>;
        set: (
            name: string,
            value: string,
            options?: Record<string, unknown>,
        ) => void;
    };

    // Create a server's supabase client with newly configured cookie,
    // which could be used to maintain user's session
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStoreRW
                        .getAll()
                        .map((c: { name: string; value: string }) => ({
                            name: c.name,
                            value: c.value,
                        }));
                },
                setAll(
                    cookiesToSet: Array<{
                        name: string;
                        value: string;
                        options?: Record<string, unknown> & {
                            secure?: boolean;
                        };
                    }>,
                ) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStoreRW.set(name, value, {
                                ...options,
                                secure: options?.secure ??
                                    process.env.NODE_ENV === "production",
                            })
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        },
    ) as unknown as SupabaseClient<Database>;
}
