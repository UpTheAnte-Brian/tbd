// DEPRECATED: Use /api/entities/[id]/users for entity-scoped operations.
import type { NextRequest } from "next/server";
import {
    handleNonprofitUserDelete,
    handleNonprofitUserGet,
    handleNonprofitUserPatch,
} from "@/app/lib/server/users/handlers";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/nonprofit-users/[id]
 * Optional convenience handler — returns a single assignment
 */
export async function GET(req: NextRequest, context: RouteParams) {
    return handleNonprofitUserGet(req, context);
}

/**
 * PATCH /api/nonprofit-users/[id]
 * Body: { role? }
 */
export async function PATCH(req: NextRequest, context: RouteParams) {
    return handleNonprofitUserPatch(req, context);
}

/**
 * DELETE /api/nonprofit-users/[id]
 */
export async function DELETE(req: NextRequest, context: RouteParams) {
    return handleNonprofitUserDelete(req, context);
}
