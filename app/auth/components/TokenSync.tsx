"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/utils/supabase/client";

export function TokenSync() {
  useEffect(() => {
    const supabase = getSupabaseClient();
    const sync = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token && session?.refresh_token) {
        await fetch("/auth/set-token-cookie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            },
          }),
        });
      }
    };

    sync();
  }, []);

  return null;
}
