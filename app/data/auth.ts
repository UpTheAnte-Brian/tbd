import "server-only";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";

// Cached helper methods makes it easy to get the same value in many places
// without manually passing it around. This discourages passing it from Server
// Component to Server Component which minimizes risk of passing it to a Client
// Component.
export const getCurrentUser = cache(async () => {
    const supabase = await createClient();
    // const token = (await cookies()).get("sb-access-token");
    // const decodedToken = await decryptAndValidate(token);

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        // Supabase returns "Auth session missing" when there is simply no session;
        // treat that as an anonymous user without logging noise.
        if (error.message?.toLowerCase().includes("auth session missing")) {
            return null;
        }
        console.error("Error fetching user server-side:", error.message);
        return null;
    }
    // Don't include secret tokens or private information as public fields.
    // Use classes to avoid accidentally passing the whole object to the client.
    return user;
});
