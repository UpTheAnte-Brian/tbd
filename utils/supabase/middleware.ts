export const runtime = "nodejs";
import { type NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function updateSession(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1️⃣ Always allow auth + api routes
    if (
        pathname.startsWith("/auth") || pathname.startsWith("/api") ||
        pathname.startsWith("/districts") || pathname.startsWith("/donate")
    ) {
        return NextResponse.next();
    }

    // 2️⃣ Reconstruct supabase auth token from cookies
    const supabaseChunks = request.cookies
        .getAll()
        .filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name) // match sb-xxx-auth-token or sb-xxx-auth-token.0, .1 …
        )
        .sort((a, b) => {
            const ai = parseInt(a.name.split(".").pop() || "0", 10);
            const bi = parseInt(b.name.split(".").pop() || "0", 10);
            return ai - bi;
        })
        .map((c, i) => (i === 0 ? c.value.replace(/^base64-/, "") : c.value));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabaseDecoded: any = undefined;
    if (supabaseChunks.length > 0) {
        try {
            const combined = supabaseChunks.join("");
            const jsonStr = Buffer.from(combined, "base64").toString("utf-8");
            supabaseDecoded = JSON.parse(jsonStr);
        } catch (err) {
            console.error("Failed to decode supabase auth token:", err);
        }
    }
    const token = supabaseDecoded ? supabaseDecoded.access_token : undefined;

    // 3️⃣ If no token and not on auth/api/home, redirect to sign in
    if (!token) {
        if (
            pathname !== "/" && !pathname.startsWith("/auth") &&
            !pathname.startsWith("/api")
        ) {
            const url = request.nextUrl.clone();
            url.pathname = "/auth/sign-in";
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    interface SupabaseJWT {
        app_metadata?: {
            role?: string;
        };
        [key: string]: unknown;
    }

    let role: string | null = null;
    if (token) {
        try {
            const decoded = jwt.decode(token) as SupabaseJWT | null;
            role = decoded?.app_metadata?.role ?? null;
        } catch (err) {
            console.error("JWT decode error:", err);
        }
    }

    const adminCookie = role === "admin";

    // 4️⃣ Restrict /users list to admins only
    if (pathname === "/users" && !adminCookie) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    // 5️⃣ Restrict /admin pages to admins only
    if (pathname.startsWith("/admin") && !adminCookie) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    // 6️⃣ Pass through with headers set
    const response = NextResponse.next({ request });

    if (role) response.headers.set("x-user-role", role);
    response.headers.set("x-user-admin", adminCookie ? "true" : "false");

    return response;
}
