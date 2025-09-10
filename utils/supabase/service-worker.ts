// utils/supabase/service-worker.ts
import { createClient } from "@supabase/supabase-js";

export const supabaseServiceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role
);
