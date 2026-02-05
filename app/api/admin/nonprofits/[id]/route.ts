import { NextRequest, NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { getNonprofitReview } from "@/domain/admin/nonprofits-admin-dto";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return safeRoute(async () => {
    if (areAdminToolsDisabled()) {
      return jsonError("Admin routes are disabled.", 403);
    }

    const { id } = await context.params;
    const rawEin = id ? decodeURIComponent(id) : "";
    if (!rawEin) {
      return jsonError("EIN is required", 400);
    }

    const data = await getNonprofitReview(rawEin);
    return NextResponse.json(data);
  });
}
