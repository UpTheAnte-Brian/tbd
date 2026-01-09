// DEPRECATED: Use /api/entities/[id]/users for entity-scoped operations.
import type { NextRequest } from "next/server";
import {
  handleLegacyEntityUsersDelete,
  handleLegacyEntityUsersPost,
} from "@/app/lib/server/users/handlers";

// Upsert/update role
export async function POST(req: NextRequest) {
  return handleLegacyEntityUsersPost(req);
}

// Delete role
export async function DELETE(req: NextRequest) {
  return handleLegacyEntityUsersDelete(req);
}
