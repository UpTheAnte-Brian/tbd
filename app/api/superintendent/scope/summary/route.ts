import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { getScopeSummary } from "@/app/lib/superintendent/scope-summary";

export async function GET(request: NextRequest) {
  const districtEntityIdRaw = request.nextUrl.searchParams.get(
    "districtEntityId",
  );
  const districtEntityId = districtEntityIdRaw?.trim() ?? "";

  return safeRoute(async () => {
    if (!districtEntityId) {
      return jsonError("districtEntityId is required", 400);
    }

    const summary = await getScopeSummary(districtEntityId);
    return NextResponse.json(summary);
  });
}
