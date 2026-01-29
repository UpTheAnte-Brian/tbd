import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import {
  getNonprofitOnboardingData,
  upsertOnboardingProgress,
} from "@/domain/admin/nonprofit-onboarding-dto";
import type { UpdateOnboardingProgressRequest } from "@/app/lib/types/nonprofit-onboarding";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

export async function PATCH(
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
    const body = (await req.json().catch(() => null)) as
      | UpdateOnboardingProgressRequest
      | null;

    if (!body?.section || !body?.status) {
      return jsonError("section and status are required", 400);
    }

    await upsertOnboardingProgress(id, body.section, body.status);
    const payload = await getNonprofitOnboardingData(id, scopeId);
    return NextResponse.json<typeof payload>(payload);
  });
}
