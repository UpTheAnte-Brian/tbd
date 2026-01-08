/* eslint-disable @typescript-eslint/no-unused-vars */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL; // TODO: remove SUPABASE_URL fallback after migration
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL (preferred) or SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY",
    );
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
    // your logic
}

main();
