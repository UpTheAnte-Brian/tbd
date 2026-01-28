import { NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { searchNonprofits } from "@/domain/admin/nonprofits-admin-dto";

export async function GET(req: Request) {
  return safeRoute(async () => {
    if (process.env.NODE_ENV === "production") {
      return jsonError("Admin routes are disabled in production.", 403);
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") ?? searchParams.get("query") ?? "";
    const trimmed = query.trim();
    const results = trimmed ? await searchNonprofits(trimmed) : [];
    return NextResponse.json({ results });
  });
}
