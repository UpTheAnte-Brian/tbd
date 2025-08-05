import { NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "../../../utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const isProd = process.env.NODE_ENV === "production";
  const host = request.headers.get("x-forwarded-host") ||
    request.headers.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const fullUrl = request.url.startsWith("http")
    ? request.url
    : `${protocol}://${host}${request.url}`;
  const origin = `${protocol}://${host}`;

  const url = new URL(fullUrl);

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data: session, error } = await supabase.auth.exchangeCodeForSession(
      code,
    );

    if (!error) { // after session exchange
      let role = "authenticated";

      let sessionData;
      for (let i = 0; i < 10; i++) {
        const result = await supabase.auth.getSession();
        if (result.data?.session?.access_token) {
          sessionData = result.data;
          const { data: roleData, error: userRoleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session?.user?.id)
            .maybeSingle();
          if (!userRoleError) {
            role = roleData?.role;
          }
          break;
        }
        await new Promise((res) => setTimeout(res, 100));
      }

      // For alternative RLS approach for admin
      // await fetch(`${process.env.NEXT_PUBLIC_HOST}/auth/set-token-cookie`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     session: {
      //       access_token: sessionData.session.access_token,
      //       refresh_token: sessionData.session.refresh_token,
      //     },
      //   }),
      //   credentials: "include", // so the cookie is set
      // });
      if (sessionData?.session?.access_token) {
        (await cookies()).set("role", role, {
          path: "/",
          httpOnly: true,
          secure: isProd,
          sameSite: "lax",
        });
      }

      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer

      if (!isProd) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
