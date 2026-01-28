import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import {
  getNonprofitOnboardingData,
  upsertEntityPersonClaim,
} from "@/domain/admin/nonprofit-onboarding-dto";

export async function POST(
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
      | { source_person_id?: string | null; email?: string | null }
      | null;

    const sourcePersonId = body?.source_person_id?.trim();
    const email = body?.email?.trim();

    if (!sourcePersonId) {
      return jsonError("source_person_id is required", 400);
    }

    if (!email) {
      return jsonError("email is required", 400);
    }

    if (!email.includes("@")) {
      return jsonError("valid email is required", 400);
    }

    await upsertEntityPersonClaim({
      entityId: id,
      sourcePersonId,
      email,
    });

    const payload = await getNonprofitOnboardingData(id, scopeId);
    return NextResponse.json<typeof payload>(payload);
  });
}
