import { cookies } from "next/headers";

export async function POST(req: Request) {
    const isProd = process.env.NODE_ENV === "production";

    const { role } = await req.json();
    (await cookies()).set("role", role, {
        path: "/",
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
    });
    return new Response(null, { status: 204 });
}
