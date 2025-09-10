// /pages/api/admin/set-role.ts (Next.js)
import { NextApiRequest, NextApiResponse } from "next";
import { supabaseServiceClient } from "../../../utils/supabase/service-worker";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") return res.status(405).end();

    const { userId, role } = req.body;

    if (!userId || !role) {
        return res.status(400).json({ error: "Missing userId or role" });
    }

    try {
        // 1. Update profiles table
        const { error: profileError } = await supabaseServiceClient
            .from("profiles")
            .update({ role })
            .eq("id", userId);

        if (profileError) throw profileError;

        // 2. Update auth.users.app_metadata
        const { error: authError } = await supabaseServiceClient.auth.admin
            .updateUserById(
                userId,
                { app_metadata: { role } },
            );

        if (authError) throw authError;

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("Failed to set role:", err);
        return res.status(500).json({ error: "Failed to update role" });
    }
}
