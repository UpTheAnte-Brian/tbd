import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import {
  getNonprofitOnboardingData,
  updateNonprofitIdentity,
} from "@/domain/admin/nonprofit-onboarding-dto";
import type { UpdateOnboardingIdentityRequest } from "@/app/lib/types/nonprofit-onboarding";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return safeRoute(async () => {
    if (process.env.NODE_ENV === "production") {
      return jsonError("Admin routes are disabled in production.", 403);
    }

    const { id } = await context.params;
    if (!id) {
      return jsonError("entity_id is required", 400);
    }

    const scopeId = req.nextUrl.searchParams.get("scope_id");
    const body = (await req.json().catch(() => null)) as
      | UpdateOnboardingIdentityRequest
      | null;

    if (!body) {
      return jsonError("Request body is required", 400);
    }

    await updateNonprofitIdentity(id, body);
    const payload = await getNonprofitOnboardingData(id, scopeId);
    return NextResponse.json<typeof payload>(payload);
  });
}
