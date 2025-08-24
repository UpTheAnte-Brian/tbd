"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "../../../utils/supabase/client";

const supabase = getSupabaseClient();

export default function DebugJWT() {
  useEffect(() => {
    const refreshAndLogJWT = async () => {
      await supabase.auth.refreshSession();
      const { data: session } = await supabase.auth.getSession();
      console.log("Access token:", session.session?.access_token);

      const token = session.session?.access_token;
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        console.log("JWT Payload:", payload);
      }
    };

    refreshAndLogJWT();
  }, []);

  return null;
}
