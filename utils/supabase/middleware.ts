export const runtime = "nodejs";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
    if (
        request.nextUrl.pathname.startsWith("/auth") ||
        request.nextUrl.pathname.startsWith("/api")
    ) {
        return NextResponse.next();
    }

    // console.log("All cookies:", request.cookies.getAll());

    // Collect supabase-[projectId]-auth-token.[index] cookies
    const supabaseChunks = request.cookies
        .getAll()
        .filter((c) => c.name.includes("-auth-token."))
        .sort((a, b) => {
            const ai = parseInt(a.name.split(".").pop() || "0", 10);
            const bi = parseInt(b.name.split(".").pop() || "0", 10);
            return ai - bi;
        })
        .map((c, i) => i === 0 ? c.value.replace(/^base64-/, "") : c.value);

    let supabaseDecoded = undefined;
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
    const role = request.cookies.get("sb-role")?.value;
    const admin = request.cookies.get("sb-admin")?.value;
    const adminCookie = request.cookies.get("sb-admin")?.value === "true";

    if (!token) {
        if (
            !request.nextUrl.pathname.startsWith("/auth") &&
            request.nextUrl.pathname !== "/" &&
            !request.nextUrl.pathname.startsWith("/api")
        ) {
            const url = request.nextUrl.clone();
            url.pathname = "/auth/sign-in";
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    if (request.nextUrl.pathname.startsWith("/admin") && !adminCookie) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    const response = NextResponse.next({ request });

    if (role) {
        response.headers.set("x-user-role", role);
    }

    if (admin) {
        response.headers.set("x-user-admin", admin);
    }

    return response;
}

// export const runtime = "nodejs";
// import { type NextRequest, NextResponse } from "next/server";
// import { decodeJwt, importJWK, jwtVerify } from "jose";

// export async function updateSession(request: NextRequest) {
//     if (request.nextUrl.pathname.startsWith("/auth")) {
//         return NextResponse.next();
//     }

//     // JWKS is a callable verifier function, not serializable
//     // const JWKS = createRemoteJWKSet(
//     //     new URL("https://ficwwbcophgsttirthxd.supabase.co/auth/v1/keys"),
//     // );
//     const supabaseResponse = NextResponse.next({ request });

//     const token = request.cookies.get("sb-access-token")?.value;

//     if (!token) {
//         if (
//             !request.nextUrl.pathname.startsWith("/login") &&
//             !request.nextUrl.pathname.startsWith("/")
//         ) {
//             const url = request.nextUrl.clone();
//             url.pathname = "/auth/sign-in";
//             console.log("redirect to signin");
//             return NextResponse.redirect(url);
//         }
//         return supabaseResponse;
//     }

//     // your JWK object

//     // your JWK object
//     const jwk = {
//         x: "YxpWC7TfWk_RsF6g6ygfSWCMO7KVgXagEH-cFGdo9Jo",
//         y: "xkkuGh0GrLZ7MgSMgC1CvlIdqMpmrepkNgmDkNJVaXs",
//         alg: "ES256",
//         crv: "P-256",
//         ext: true,
//         kid: "c6963d48-41ff-44f2-b2cc-4578641da01a",
//         kty: "EC",
//         key_ops: ["verify"],
//     };
//     try {
//         try {
//             const decoded = decodeJwt(token);
//             console.log("Decoded payload:", decoded);
//         } catch (err) {
//             console.error("Failed to decode JWT:", err);
//         }
//         // convert the JWK into a usable key
//         const publicKey = await importJWK(jwk, "ES256");

//         // verify the token
//         const { payload } = await jwtVerify(token, publicKey);
//         const role = payload?.role;
//         console.log("payload: ", JSON.stringify(payload));
//         // console.log(
//         //     "payload: ",
//         //     JSON.stringify(payload?.session?.user?.user_metadata),
//         // );
//         if (role) {
//             console.log("role: ", role);
//             supabaseResponse.headers.set("x-user-role", role as string);
//         }
//     } catch (err) {
//         console.error("JWT verification failed:", err);
//         const url = request.nextUrl.clone();
//         url.pathname = "/auth/sign-in";
//         return NextResponse.redirect(url);
//     }

//     return supabaseResponse;
// }
