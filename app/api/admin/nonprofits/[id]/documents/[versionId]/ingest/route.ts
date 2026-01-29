import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { ingestDocumentStub } from "@/domain/admin/nonprofit-documents-dto";
import { getNonprofitOnboardingData } from "@/domain/admin/nonprofit-onboarding-dto";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; versionId: string }> },
) {
  return safeRoute(async () => {
    if (areAdminToolsDisabled()) {
      return jsonError("Admin routes are disabled.", 403);
    }

    const { id, versionId } = await context.params;
    if (!id || !versionId) {
      return jsonError("entity_id and version_id are required", 400);
    }

    const scopeId = req.nextUrl.searchParams.get("scope_id");
    await ingestDocumentStub({ entityId: id, versionId });
    const payload = await getNonprofitOnboardingData(id, scopeId);
    return NextResponse.json<typeof payload>(payload);
  });
}
