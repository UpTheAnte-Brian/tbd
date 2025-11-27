import { CookieOptions, createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
    const response = NextResponse.next();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string): string | undefined {
                    return request.cookies.get(name)?.value;
                },
                set(
                    name: string,
                    value: string,
                    options: CookieOptions,
                ): void {
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions): void {
                    response.cookies.set({
                        name,
                        value: "",
                        ...options,
                    });
                },
            },
        },
    );

    await supabase.auth.getSession();

    // Admin route enforcement
    const {
        data: { session },
    } = await supabase.auth.getSession();

    // Load full role & permissions from combined security view
    const { data: sec } = await supabase
        .from("user_security_roles")
        .select("*")
        .eq("id", session?.user?.id)
        .single();

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
            match: (p) => /^\/foundations\/[\w-]+\/manage/.test(p),
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
