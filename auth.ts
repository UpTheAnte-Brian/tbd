// import NextAuth, { DefaultSession } from "next-auth";
// import { SupabaseAdapter } from "@auth/supabase-adapter";
// import { Adapter } from "next-auth/adapters";
// import GoogleProvider from "next-auth/providers/google";
// import "next-auth/jwt";

// const { handlers, signIn, signOut, auth } = NextAuth(() => {
//   if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
//     throw new Error("Google credentials are not set");
//   }
//   if (
//     !process.env.NEXT_PUBLIC_SUPABASE_URL ||
//     !process.env.SUPABASE_SERVICE_ROLE_KEY
//   ) {
//     throw new Error("Supabase credentials are not set");
//   }
//   return {
//     debug: !!process.env.AUTH_DEBUG,
//     basePath: "/api/auth",
//     session: { strategy: "jwt" },
//     // theme: { logo: "./public/UTALogos/1.png" },
//     providers: [
//       GoogleProvider({
//         clientId: process.env.AUTH_GOOGLE_ID,
//         clientSecret: process.env.AUTH_GOOGLE_SECRET,
//       }),
//     ],
//     adapter: SupabaseAdapter({
//       url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
//       secret: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
//     }) as Adapter,
//     callbacks: {
//       authorized({ request, auth }) {
//         const { pathname } = request.nextUrl;
//         if (pathname === "/middleware-example") return !!auth;
//         return true;
//       },
//       async jwt({ token, account, profile }) {
//         // Persist the OAuth access_token and or the user id to the token right after signin
//         if (account) {
//           token.accessToken = account.access_token;
//           token.id = profile?.id;
//         }
//         return token;
//       },
//       async redirect({ url, baseUrl }) {
//         // Allows relative callback URLs
//         if (url.startsWith("/")) return `${baseUrl}${url}`;
//         // Allows callback URLs on the same origin
//         else if (new URL(url).origin === baseUrl) return url;
//         return baseUrl;
//       },
//       // jwt({ token, trigger, session, account }) {
//       //   if (trigger === "update") token.name = session.user.name;
//       //   if (account?.provider === "keycloak") {
//       //     return { ...token, accessToken: account.access_token };
//       //   }
//       //   return token;
//       // },
//       async session({ session, token }) {
//         if (token?.accessToken) session.supabaseAccessToken = token.accessToken;

//         return session;
//       },
//       // async session({ session, user }) {
//       //   const signingSecret = process.env.SUPABASE_JWT_SECRET;
//       //   if (signingSecret) {
//       //     const payload = {
//       //       aud: "authenticated",
//       //       exp: Math.floor(new Date(session.expires).getTime() / 1000),
//       //       sub: user.id,
//       //       email: user.email,
//       //       role: "authenticated",
//       //     };
//       //     session.supabaseAccessToken = jwt.sign(payload, signingSecret);
//       //   }
//       //   return session;
//       // },
//     },
//   };
// });

// export { auth, handlers, signIn, signOut };

// declare module "next-auth" {
//   // Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
//   interface Session {
//     // A JWT which can be used as Authorization header with supabase-js for RLS.
//     supabaseAccessToken?: string;
//     user: {
//       // The user's postal address
//       address: string;
//     } & DefaultSession["user"];
//   }
// }

// declare module "next-auth/jwt" {
//   interface JWT {
//     accessToken?: string;
//   }
// }
