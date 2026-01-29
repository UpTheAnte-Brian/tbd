import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { areAdminToolsDisabled } from "@/utils/admin-tools";
import {
  activateEntity,
  getNonprofitOnboardingData,
} from "@/domain/admin/nonprofit-onboarding-dto";

export async function POST(
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
    await activateEntity(id);
    const payload = await getNonprofitOnboardingData(id, scopeId);
    return NextResponse.json<typeof payload>(payload);
  });
}
