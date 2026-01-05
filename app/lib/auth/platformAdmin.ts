import "server-only";
import { createClient } from "@/utils/supabase/server";

/**
 * Determines whether the current authenticated user is a platform-level admin
 * (profiles.role = 'admin'). Errors are treated as non-admin.
 */
export async function isPlatformAdminServer(): Promise<boolean> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (error) return false;
        return data?.role === "admin";
    } catch {
        return false;
    }
}
