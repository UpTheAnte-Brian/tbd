import { NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { createNonprofitShell } from "@/domain/admin/nonprofit-onboarding-dto";
import { getOnboardingQueue } from "@/domain/admin/nonprofit-queue-dto";
import type { CreateNonprofitRequest } from "@/app/lib/types/nonprofit-onboarding";

export async function GET() {
  return safeRoute(async () => {
    if (process.env.NODE_ENV === "production") {
      return jsonError("Admin routes are disabled in production.", 403);
    }

    const queue = await getOnboardingQueue();
    return NextResponse.json(queue);
  });
}

export async function POST(req: Request) {
  return safeRoute(async () => {
    if (process.env.NODE_ENV === "production") {
      return jsonError("Admin routes are disabled in production.", 403);
    }

    const body = (await req.json().catch(() => null)) as
      | CreateNonprofitRequest
      | null;

    if (!body?.name || !body?.org_type || !body?.district_entity_id) {
      return jsonError(
        "name, org_type, and district_entity_id are required",
        400,
      );
    }

    const created = await createNonprofitShell(body);
    return NextResponse.json<typeof created>(created, { status: 201 });
  });
}
