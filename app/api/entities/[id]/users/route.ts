// CANONICAL: Entity-scoped users endpoint.
import type { NextRequest } from "next/server";
import {
  handleEntityUsersDelete,
  handleEntityUsersGet,
  handleEntityUsersPost,
} from "@/app/lib/server/users/handlers";

// GET /api/entities/[id]/users
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleEntityUsersGet(req, context);
}

// POST /api/entities/[id]/users
// Body: { userId, role, status? }
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleEntityUsersPost(req, context);
}

// DELETE /api/entities/[id]/users?userId=...
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleEntityUsersDelete(req, context);
}
