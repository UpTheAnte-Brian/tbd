import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { getNonprofitOnboardingData } from "@/domain/admin/nonprofit-onboarding-dto";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return safeRoute(async () => {
    if (areAdminToolsDisabled()) {
      return jsonError("Admin routes are disabled.", 403);
    }

    const { id } = await context.params;
    if (!id) {
      return jsonError("entity_id is required", 400);
    }

    const scopeId = req.nextUrl.searchParams.get("scope_id");
    const payload = await getNonprofitOnboardingData(id, scopeId);
    return NextResponse.json<typeof payload>(payload);
  });
}
