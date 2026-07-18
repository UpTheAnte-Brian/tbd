import type { NextRequest } from "next/server";
import {
  getServerClient,
  getUserOrThrow,
  jsonError,
  jsonOk,
  parseEntityId,
} from "@/app/lib/server/route-context";
import { canSendEntityInviteEmails, sendEntityInviteEmail } from "@/app/lib/server/entity-invite-email";
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

    const inviteUrl = new URL("/invite", req.nextUrl.origin);
    inviteUrl.searchParams.set("token", invite.token);

    let delivery: "sent" | "manual" = "manual";
    const inviterLabel = (
      typeof user.user_metadata?.full_name === "string" &&
        user.user_metadata.full_name.trim()
        ? user.user_metadata.full_name.trim()
        : user.email?.trim()
    ) || "A workspace admin";

    if (canSendEntityInviteEmails()) {
      try {
        await sendEntityInviteEmail({
          to: invite.email,
          entityName: invite.entityName,
          inviterName: inviterLabel,
          desiredRole: invite.desiredRole,
          inviteUrl: inviteUrl.toString(),
          expiresAt: invite.expiresAt,
        });
        delivery = "sent";
      } catch (error) {
        console.error("Failed to send entity invite email:", error);
      }
    }

    return jsonOk(
      {
        inviteId: invite.inviteId,
        inviteUrl: inviteUrl.toString(),
        delivery,
      },
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
