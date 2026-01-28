import { NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { getNonprofitReview } from "@/domain/admin/nonprofits-admin-dto";

export async function GET(
  _req: Request,
  { params }: { params: { id?: string } },
) {
  return safeRoute(async () => {
    if (process.env.NODE_ENV === "production") {
      return jsonError("Admin routes are disabled in production.", 403);
    }

    const rawEin = params.id ? decodeURIComponent(params.id) : "";
    if (!rawEin) {
      return jsonError("EIN is required", 400);
    }

    const data = await getNonprofitReview(rawEin);
    return NextResponse.json(data);
  });
}
