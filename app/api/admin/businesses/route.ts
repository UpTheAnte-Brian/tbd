import { NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { assertAdmin } from "@/app/lib/auth/assertAdmin";
import type { CreateBusinessRequest } from "@/app/lib/types/business-admin";
import { createBusinessShell } from "@/domain/admin/businesses-admin-dto";
import { getBusinesses } from "@/domain/businesses/businesses-dto";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

async function ensureAdminAccess() {
  try {
    await assertAdmin();
    return null;
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

export async function GET() {
  return safeRoute(async () => {
    if (areAdminToolsDisabled()) {
      return jsonError("Admin routes are disabled.", 403);
    }

    const adminError = await ensureAdminAccess();
    if (adminError) return adminError;

    const businesses = await getBusinesses();
    return NextResponse.json(businesses);
  });
}

export async function POST(req: Request) {
  return safeRoute(async () => {
    if (areAdminToolsDisabled()) {
      return jsonError("Admin routes are disabled.", 403);
    }

    const adminError = await ensureAdminAccess();
    if (adminError) return adminError;

    const body = (await req.json().catch(() => null)) as
      | CreateBusinessRequest
      | null;

    if (!body?.name?.trim()) {
      return jsonError("name is required", 400);
    }

    const created = await createBusinessShell(body);
    return NextResponse.json<typeof created>(created, { status: 201 });
  });
}
