// utils/supabase/service-worker.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";

/**
 * Server-only service role client. Do not import from client components.
 */
export const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
