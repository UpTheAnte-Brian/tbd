import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

type SecurityRoles = {
    id: string;
    global_role: string | null;
    district_admin_of: string[];
    business_admin_of: string[];
    nonprofit_admin_of: string[];
};

export async function updateSession(request: NextRequest) {
    // Clone request headers so we can forward any updated cookies
    const requestHeaders = new Headers(request.headers);
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () =>
                    request.cookies.getAll().map((c) => ({
                        name: c.name,
                        value: c.value,
                    })),
                setAll: (
                    cookies: Array<{
                        name: string;
                        value: string;
                        options?: Parameters<
                            typeof response.cookies.set
                        >[2];
                    }>,
                ) => {
                    cookies.forEach((cookie) => {
                        response.cookies.set(
                            cookie.name,
                            cookie.value,
                            cookie.options,
                        );
                    });

                    // keep request headers in sync for downstream middleware/handlers
                    const forwarded = new Map(
                        request.cookies.getAll().map((c) => [c.name, c.value]),
                    );
                    cookies.forEach((cookie) => {
                        forwarded.set(cookie.name, cookie.value);
                    });
                    const cookieString = Array.from(forwarded.entries()).map((
                        [name, value],
                    ) => `${name}=${value}`).join("; ");
                    requestHeaders.set("cookie", cookieString);
                },
            },
        },
    );

    // Admin route enforcement
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id;

    if (!userId) {
        return response;
    }

    // Load full role & permissions from combined security view
    const { data: secData, error: secError } = await supabase
        .rpc("get_user_security_roles", { uid: userId })
        .maybeSingle();
    if (secError) {
        console.error("get_user_security_roles failed:", secError);
        return response;
    }
    const sec = (secData ?? null) as SecurityRoles | null;
    const globalRole: string | null = sec?.global_role ?? null;
    const districtAdminOf: string[] = sec?.district_admin_of ?? [];
    const businessAdminOf: string[] = sec?.business_admin_of ?? [];
    const nonprofitAdminOf: string[] = sec?.nonprofit_admin_of ?? [];

    const pathname = request.nextUrl.pathname;

    // Route role map with entity-specific admin support
    const routeRoles: Array<{
        match: (path: string) => boolean;
        allow: (ctx: {
            globalRole: string | null;
            districtAdminOf: string[];
            businessAdminOf: string[];
            nonprofitAdminOf: string[];
            path: string;
        }) => boolean;
    }> = [
        // Global admin-only routes
        {
            match: (p) => p.startsWith("/admin"),
            allow: ({ globalRole }) => globalRole === "admin",
        },
        {
            match: (p) => p === "/users",
            allow: ({ globalRole }) => globalRole === "admin",
        },

        // District admin tab
        {
            match: (p) => /^\/districts\/[\w-]+$/.test(p),
            allow: ({ globalRole, districtAdminOf, path }) => {
                const url = request.nextUrl;
                const tab = url.searchParams.get("tab");
                if (tab !== "Admin") return true; // allow other tabs

                if (globalRole === "admin") return true;
                const id = path.split("/")[2];
                return districtAdminOf.includes(id);
            },
        },

        // Business admin tab
        {
            match: (p) => /^\/businesses\/[\w-]+$/.test(p),
            allow: ({ globalRole, businessAdminOf, path }) => {
                const url = request.nextUrl;
                const tab = url.searchParams.get("tab");
                if (tab !== "Admin") return true;

                if (globalRole === "admin") return true;
                const id = path.split("/")[2];
                return businessAdminOf.includes(id);
            },
        },

        // Nonprofit admin tab
        {
            match: (p) => /^\/nonprofits\/[\w-]+$/.test(p),
            allow: ({ globalRole, nonprofitAdminOf, path }) => {
                const url = request.nextUrl;
                const tab = url.searchParams.get("tab");
                if (tab !== "Admin") return true;

                if (globalRole === "admin") return true;
                const id = path.split("/")[2];
                return nonprofitAdminOf.includes(id);
            },
        },
    ];

    // Enforce route protections
    for (const rule of routeRoles) {
        if (
            rule.match(pathname) &&
            !rule.allow({
                globalRole,
                districtAdminOf,
                businessAdminOf,
                nonprofitAdminOf,
                path: pathname,
            })
        ) {
            const url = request.nextUrl.clone();

            if (pathname === "/admin") {
                url.pathname = "/";
            } else {
                const districtMatch = pathname.match(
                    /^\/admin\/districts\/([\w-]+)/,
                );
                const businessMatch = pathname.match(
                    /^\/admin\/businesses\/([\w-]+)/,
                );
                const foundationMatch = pathname.match(
                    /^\/admin\/foundations\/([\w-]+)/,
                );

                if (districtMatch) {
                    url.pathname = `/districts/${districtMatch[1]}`;
                } else if (businessMatch) {
                    url.pathname = `/businesses/${businessMatch[1]}`;
                } else if (foundationMatch) {
                    url.pathname = `/foundations/${foundationMatch[1]}`;
                } else {
                    url.pathname = "/";
                }
            }

            return NextResponse.redirect(url);
        }
    }
    return response;
}

// export const runtime = "nodejs";
// import { type NextRequest, NextResponse } from "next/server";
// import jwt from "jsonwebtoken";

// export async function updateSession(request: NextRequest) {
//     const { pathname } = request.nextUrl;

//     // 1️⃣ Always allow auth + api routes
//     if (
//         pathname.startsWith("/auth") || pathname.startsWith("/api") ||
//         pathname.startsWith("/districts") || pathname.startsWith("/donate") ||
//         pathname.startsWith("/info") || pathname.startsWith("/businesses") ||
//         pathname.startsWith("/foundations") || pathname.startsWith("/users")
//     ) {
//         return NextResponse.next();
//     }

//     // 2️⃣ Reconstruct supabase auth token from cookies
//     const supabaseChunks = request.cookies
//         .getAll()
//         .filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name) // match sb-xxx-auth-token or sb-xxx-auth-token.0, .1 …
//         )
//         .sort((a, b) => {
//             const ai = parseInt(a.name.split(".").pop() || "0", 10);
//             const bi = parseInt(b.name.split(".").pop() || "0", 10);
//             return ai - bi;
//         })
//         .map((c, i) => (i === 0 ? c.value.replace(/^base64-/, "") : c.value));

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     let supabaseDecoded: any = undefined;
//     if (supabaseChunks.length > 0) {
//         try {
//             const combined = supabaseChunks.join("");
//             const jsonStr = Buffer.from(combined, "base64").toString("utf-8");
//             supabaseDecoded = JSON.parse(jsonStr);
//         } catch (err) {
//             console.error("Failed to decode supabase auth token:", err);
//         }
//     }
//     const token = supabaseDecoded ? supabaseDecoded.access_token : undefined;

//     // 3️⃣ If no token and not on auth/api/home, redirect to sign in
//     if (!token) {
//         if (
//             pathname !== "/" && !pathname.startsWith("/auth") &&
//             !pathname.startsWith("/api")
//         ) {
//             const url = request.nextUrl.clone();
//             url.pathname = "/auth/sign-in";
//             return NextResponse.redirect(url);
//         }
//         return NextResponse.next();
//     }

//     interface SupabaseJWT {
//         app_metadata?: {
//             role?: string;
//         };
//         [key: string]: unknown;
//     }

//     let role: string | null = null;
//     if (token) {
//         try {
//             const decoded = jwt.decode(token) as SupabaseJWT | null;
//             role = decoded?.app_metadata?.role ?? null;
//         } catch (err) {
//             console.error("JWT decode error:", err);
//         }
//     }

//     const adminCookie = role === "admin";

//     // 4️⃣ Restrict /users list to admins only
//     if (pathname === "/users" && !adminCookie) {
//         const url = request.nextUrl.clone();
//         url.pathname = "/";
//         return NextResponse.redirect(url);
//     }

//     // 5️⃣ Restrict /admin pages to admins only
//     if (pathname.startsWith("/admin") && !adminCookie) {
//         const url = request.nextUrl.clone();
//         url.pathname = "/";
//         return NextResponse.redirect(url);
//     }

//     // 6️⃣ Pass through with headers set
//     const response = NextResponse.next({ request });

//     if (role) response.headers.set("x-user-role", role);
//     response.headers.set("x-user-admin", adminCookie ? "true" : "false");

//     return response;
// }
