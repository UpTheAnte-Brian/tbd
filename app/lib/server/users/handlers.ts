import "server-only";

import type { NextRequest } from "next/server";
import {
  getServerClient,
  getUserOrThrow,
  jsonError,
  jsonOk,
  parseEntityId,
} from "@/app/lib/server/route-context";
import { isGlobalAdmin, requireEntityAdmin } from "@/app/lib/server/rbac";
import {
  deleteEntityUser,
  getEntityUsers,
  upsertEntityUser,
} from "@/app/lib/server/entities";
import type { EntityUserRole, EntityUserStatus } from "@/domain/entities/types";
import { supabaseAdmin } from "@/utils/supabase/service-worker";

interface EntityUsersRouteParams {
  params: Promise<{ id: string }>;
}

export async function handleEntityUsersGet(
  _req: NextRequest,
  context: EntityUsersRouteParams,
) {
  const supabase = await getServerClient();

  try {
    const entityId = await parseEntityId(supabase, context.params);
    const user = await getUserOrThrow(supabase);
    const globalAdmin = await isGlobalAdmin(supabase, user);
    if (!globalAdmin) {
      await requireEntityAdmin({ supabase, userId: user.id, entityId });
    }

    const users = await getEntityUsers(supabaseAdmin, entityId);
    return jsonOk(users);
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to load entity users";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 403
      : lower.includes("entity not found")
      ? 404
      : 500;
    return jsonError(message, status);
  }
}

export async function handleEntityUsersPost(
  req: NextRequest,
  context: EntityUsersRouteParams,
) {
  const supabase = await getServerClient();

  let body: {
    userId?: string;
    role?: EntityUserRole;
    status?: EntityUserStatus | null;
  };

  try {
    body = (await req.json()) as {
      userId?: string;
      role?: EntityUserRole;
      status?: EntityUserStatus | null;
    };
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  if (!body.userId || !body.role) {
    return jsonError("userId and role are required", 400);
  }

  // Defensive validation in case callers send arbitrary strings
  const allowedStatuses: ReadonlySet<EntityUserStatus> = new Set([
    "active",
    "invited",
    "removed",
  ]);
  if (body.status != null && !allowedStatuses.has(body.status)) {
    return jsonError("status must be one of: active, invited, removed", 400);
  }

  // IMPORTANT: entity_users.status is NOT NULL; default to 'active' when omitted or null
  const status: EntityUserStatus = body.status ?? "active";

  try {
    const entityId = await parseEntityId(supabase, context.params);
    const user = await getUserOrThrow(supabase);
    const globalAdmin = await isGlobalAdmin(supabase, user);
    if (!globalAdmin) {
      await requireEntityAdmin({ supabase, userId: user.id, entityId });
    }

    const entityUser = await upsertEntityUser(
      supabaseAdmin,
      entityId,
      body.userId,
      body.role,
      status,
    );
    return jsonOk(entityUser, { status: 201 });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to update entity user";
    const lower = message.toLowerCase();
    const statusCode = lower.includes("unauthorized")
      ? 403
      : lower.includes("entity not found")
      ? 404
      : 500;
    return jsonError(message, statusCode);
  }
}

export async function handleEntityUsersDelete(
  req: NextRequest,
  context: EntityUsersRouteParams,
) {
  const supabase = await getServerClient();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return jsonError("userId is required", 400);
  }

  try {
    const entityId = await parseEntityId(supabase, context.params);
    const user = await getUserOrThrow(supabase);
    const globalAdmin = await isGlobalAdmin(supabase, user);
    if (!globalAdmin) {
      await requireEntityAdmin({ supabase, userId: user.id, entityId });
    }

    await deleteEntityUser(supabaseAdmin, entityId, userId);
    return jsonOk({ success: true });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to delete entity user";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 403
      : lower.includes("entity not found")
      ? 404
      : 500;
    return jsonError(message, status);
  }
}
