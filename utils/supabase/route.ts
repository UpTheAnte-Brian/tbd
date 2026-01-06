// utils/supabase/route.ts
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/database.types";

export async function createApiClient(): Promise<SupabaseClient<Database>> {
    const cookieStore = await cookies();

    // Next.js typings can represent `cookies()` differently depending on runtime (RSC vs route handlers).
    // We only rely on `getAll()` and `set()` here.
    const cookieStoreRW = cookieStore as unknown as {
        getAll: () => Array<{ name: string; value: string }>;
        set: (
            name: string,
            value: string,
            options?: Record<string, unknown>,
        ) => void;
    };

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
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStoreRW.set(name, value, {
                            ...options,
                            secure: options?.secure ??
                                process.env.NODE_ENV === "production",
                        });
                    });
                },
            },
        },
    ) as unknown as SupabaseClient<Database>;
}
