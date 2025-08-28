import { NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "../../../utils/supabase/server";
import { cookies } from "next/headers";
import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

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
    if (error) {
      console.error("Failed to decode supabase auth token:", error);
      // TODO: Create a dedicated /auth/auth-code-error page.
      // For now, redirect users to the app root so they don't get stuck.
      return NextResponse.redirect(origin);
    } else {
      // OTP / magic link flow: session already exists
      // Nothing to exchange — cookies are already set by Supabase client
    }

    if (!error) { // after session exchange
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      let role = "authenticated";
      if (user?.user_metadata?.role) {
        role = user.user_metadata.role;
      } else if (user?.user_metadata?.admin === true) {
        role = "admin";
      }

      let sessionData;
      for (let i = 0; i < 10; i++) {
        const result = await supabase.auth.getSession();
        if (result.data?.session?.access_token) {
          sessionData = result.data;
          if (role === "authenticated") {
            const { data: roleData, error: userRoleError } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session?.user?.id)
              .maybeSingle();
            if (!userRoleError) {
              role = roleData?.role;
            }
          }
          break;
        }
        await new Promise((res) => setTimeout(res, 100));
      }

      if (sessionData?.session?.access_token) {
        const cookieOptions = {
          path: "/",
          httpOnly: true,
          secure: isProd,
          sameSite: "lax",
        };
        (await cookies()).set(
          "role",
          role,
          cookieOptions as Partial<ResponseCookie>,
        );
        const isAdmin = role === "admin";
        (await cookies()).set(
          "sb-admin",
          isAdmin ? "true" : "false",
          cookieOptions as Partial<ResponseCookie>,
        );
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

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }
}
