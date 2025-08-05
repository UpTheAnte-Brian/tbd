// app/auth/set-token-cookie/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const recentTokenSetters = new Map<string, number>();
const THROTTLE_MS = 30_000; // 30 seconds between requests

export async function POST(req: NextRequest) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown";
    const lastRequest = recentTokenSetters.get(ip);
    const now = Date.now();

    if (lastRequest && now - lastRequest < THROTTLE_MS) {
        console.warn(`Throttled set-token-cookie attempt from ${ip}`);
        return NextResponse.json({ error: "Too many requests" }, {
            status: 429,
        });
    }

    recentTokenSetters.set(ip, now);

    const { session: { access_token, refresh_token } } = await req.json();

    if (!access_token || !refresh_token) {
        console.log(
            "no access or refresh token: ",
            access_token,
            refresh_token,
        );
        return NextResponse.json({ error: "Missing token(s)" }, {
            status: 400,
        });
    }

    const cookieStore = await cookies();

    cookieStore.set("sb-access-token", access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60, // 1 hour
    });

    cookieStore.set("sb-refresh-token", refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return NextResponse.json({ success: true });
}

export async function DELETE() {
    const cookieStore = await cookies();

    cookieStore.set("sb-access-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 0,
    });

    cookieStore.set("sb-refresh-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 0,
    });

    return NextResponse.json({ success: true });
}
