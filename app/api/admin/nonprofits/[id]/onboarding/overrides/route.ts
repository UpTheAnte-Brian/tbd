import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import {
  deleteEntityFieldOverride,
  getNonprofitOnboardingData,
  upsertEntityFieldOverride,
} from "@/domain/admin/nonprofit-onboarding-dto";
import type { UpsertOverrideRequest } from "@/app/lib/types/nonprofit-onboarding";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

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
    const body = (await req.json().catch(() => null)) as
      | UpsertOverrideRequest
      | null;

    if (!body?.namespace || !body?.field_key) {
      return jsonError("namespace and field_key are required", 400);
    }

    await upsertEntityFieldOverride(id, body);
    const payload = await getNonprofitOnboardingData(id, scopeId);
    return NextResponse.json<typeof payload>(payload);
  });
}

export async function DELETE(
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
      | { namespace?: string; field_key?: string }
      | null;

    if (!body?.namespace || !body?.field_key) {
      return jsonError("namespace and field_key are required", 400);
    }

    await deleteEntityFieldOverride(id, body.namespace, body.field_key);
    const payload = await getNonprofitOnboardingData(id, scopeId);
    return NextResponse.json<typeof payload>(payload);
  });
}
