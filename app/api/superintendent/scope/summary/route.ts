import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { createApiClient } from "@/utils/supabase/route";
import { requireEntityAdmin, requireGlobalAdmin } from "@/app/lib/server/rbac";
import { getScopeSummary } from "@/app/lib/superintendent/scope-summary";

async function assertDistrictAccess(districtEntityId: string) {
  const supabase = await createApiClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Unauthorized");
  }

  try {
    await requireEntityAdmin({
      supabase,
      userId: data.user.id,
      entityId: districtEntityId,
    });
    return;
  } catch {
    await requireGlobalAdmin(supabase, data.user);
  }
}

export async function GET(request: NextRequest) {
  const districtEntityIdRaw = request.nextUrl.searchParams.get(
    "districtEntityId",
  );
  const districtEntityId = districtEntityIdRaw?.trim() ?? "";

  return safeRoute(async () => {
    if (!districtEntityId) {
      return jsonError("districtEntityId is required", 400);
    }

    try {
      await assertDistrictAccess(districtEntityId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unauthorized";
      const status = message === "Unauthorized" ? 401 : 403;
      return jsonError(message, status);
    }

    const summary = await getScopeSummary(districtEntityId);
    return NextResponse.json(summary);
  });
}
