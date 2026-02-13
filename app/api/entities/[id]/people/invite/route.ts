import type { NextRequest } from "next/server";
import {
  getServerClient,
  getUserOrThrow,
  jsonError,
  jsonOk,
  parseEntityId,
} from "@/app/lib/server/route-context";
import { isGlobalAdmin, requireEntityAdmin } from "@/app/lib/server/rbac";
import { createEntityUserInvite } from "@/domain/entities/entity-people-dto";
import type { EntityUserRole } from "@/domain/entities/types";

const ALLOWED_ROLES: ReadonlySet<EntityUserRole> = new Set([
  "admin",
  "editor",
  "viewer",
  "employee",
]);

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await getServerClient();

  let body: {
    email?: string;
    desiredRole?: EntityUserRole;
    entityPersonRoleId?: string | null;
  };

  try {
    body = (await req.json()) as {
      email?: string;
      desiredRole?: EntityUserRole;
      entityPersonRoleId?: string | null;
    };
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const email = typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : "";
  if (!email) {
    return jsonError("email is required", 400);
  }

  const desiredRole = body.desiredRole;
  if (!desiredRole || !ALLOWED_ROLES.has(desiredRole)) {
    return jsonError(
      "desiredRole must be one of: admin, editor, viewer, employee",
      400,
    );
  }

  try {
    const entityId = await parseEntityId(supabase, context.params);
    const user = await getUserOrThrow(supabase);
    const globalAdmin = await isGlobalAdmin(supabase, user);
    if (!globalAdmin) {
      await requireEntityAdmin({ supabase, userId: user.id, entityId });
    }

    const invite = await createEntityUserInvite({
      entityId,
      email,
      desiredRole,
      entityPersonRoleId: typeof body.entityPersonRoleId === "string"
        ? body.entityPersonRoleId
        : null,
      invitedBy: user.id,
    });

    return jsonOk(
      { rawToken: invite.token, inviteId: invite.inviteId },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to create invite";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 403
      : lower.includes("entity not found")
      ? 404
      : 500;
    return jsonError(message, status);
  }
}
