// utils/supabase/service-worker.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { PostgrestClient } from "@supabase/postgrest-js";
import type { Database } from "@/database.types";

/**
 * Server-only service role client. Do not import from client components.
 */
export const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type IrsPostgrestClient = PostgrestClient<
    Database,
    Database["__InternalSupabase"],
    "irs",
    Database["irs"]
>;

export function createIrsAdminClient(): IrsPostgrestClient {
    return supabaseAdmin.schema("irs");
}
