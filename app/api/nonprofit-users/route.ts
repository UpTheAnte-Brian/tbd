// DEPRECATED: Use /api/entities/[id]/users for entity-scoped operations.
import type { NextRequest } from "next/server";
import {
    handleNonprofitUsersGet,
    handleNonprofitUsersPost,
} from "@/app/lib/server/users/handlers";

// GET /api/nonprofit-users
// Returns all nonprofit-user assignments (public read allowed by RLS)
export async function GET() {
    return handleNonprofitUsersGet();
}

// POST /api/nonprofit-users
// Body:
// { nonprofit_id, user_id, role? }
export async function POST(req: NextRequest) {
    return handleNonprofitUsersPost(req);
}
