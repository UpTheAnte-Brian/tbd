import { createClient } from "../../../utils/supabase/server";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers"; // added import

// Add this at the top of your file (module-level cache)
const recentSignouts = new Map<string, number>();
const THROTTLE_MS = 30_000; // e.g. 30 seconds between requests

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const lastSignout = recentSignouts.get(ip);

  const now = Date.now();
  if (lastSignout && now - lastSignout < THROTTLE_MS) {
    console.warn(`Throttled signout attempt from ${ip}`);
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (user) {
    await supabase.auth.signOut();
    (await cookies()).set("sb-admin", "", {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 0, // deletes the cookie
    });
    recentSignouts.set(ip, now);
  }

  revalidatePath("/", "layout");
  return NextResponse.redirect(new URL("/auth/sign-in", req.url), {
    status: 302,
  });
}
