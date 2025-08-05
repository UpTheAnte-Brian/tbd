import { createClient } from "../../../utils/supabase/server";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
// Add this at the top of your file (module-level cache)
const recentSignouts = new Map<string, number>();
const THROTTLE_MS = 30_000; // e.g. 30 seconds between requests

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // TODO: GPT-Let me know if you want to switch to something like session ID instead of IP — that’s often more precise if you can trust the session/cookie.
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
    await fetch(new URL("/auth/set-token-cookie", req.url), {
      method: "DELETE",
      headers: {
        Cookie: req.headers.get("cookie") || "",
      },
    });
    recentSignouts.set(ip, now);
  }

  revalidatePath("/", "layout");
  return NextResponse.redirect(new URL("/auth/sign-in", req.url), {
    status: 302,
  });
}
