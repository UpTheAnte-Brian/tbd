import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
    // update user's auth session
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};

// import NextAuth from "next-auth";
// import { authConfig } from "./auth.config";

// export default NextAuth(authConfig).auth;

// export const config = {
//   // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
//   matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
// };

// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";

// export function middleware(request: NextRequest) {
//   // Assume a "Cookie:nextjs=fast" header to be present on the incoming request
//   // Getting cookies from the request using the `RequestCookies` API
//   const cookie = request.cookies.get("nextjs");
//   console.log("cookie: ", cookie); // => { name: 'nextjs', value: 'fast', Path: '/' }
//   const allCookies = request.cookies.getAll();
//   console.log("allCookies: ", allCookies); // => [{ name: 'nextjs', value: 'fast' }]

//   request.cookies.has("nextjs"); // => true
//   request.cookies.delete("nextjs");
//   request.cookies.has("nextjs"); // => false

//   // Setting cookies on the response using the `ResponseCookies` API
//   const response = NextResponse.next();
//   response.cookies.set("vercel", "fast");
//   response.cookies.set({
//     name: "vercel",
//     value: "fast",
//     path: "/",
//   });
//   // cookie = response.cookies.get("vercel");
//   // console.log('last cookie: ', cookie) // => { name: 'vercel', value: 'fast', Path: '/' }
//   // The outgoing response will have a `Set-Cookie:vercel=fast;path=/` header.

//   return response;
// }
