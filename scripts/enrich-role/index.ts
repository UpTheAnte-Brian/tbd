import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const jwt = authHeader.slice("Bearer ".length).trim();

  try {
    const [, payloadB64] = jwt.split(".");
    const payloadJson = atob(payloadB64);
    const payload = JSON.parse(payloadJson);
    const user_id = payload.sub;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id)
      .maybeSingle();

    const role = data?.role || "authenticated";

    return new Response(
      JSON.stringify({
        sub: user_id, // from the JWT payload
        role: "authenticated", // required by Supabase
        user_metadata: {
          ...payload.user_metadata,
          role, // your DB-based role override
        },
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  } catch {
    return new Response("Invalid JWT", { status: 401 });
  }
});
