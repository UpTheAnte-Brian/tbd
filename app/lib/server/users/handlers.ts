import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import {
  getServerClient,
  jsonError,
  jsonOk,
  parseEntityId,
} from "@/app/lib/server/route-context";
import {
  deleteEntityUser,
  getEntityUsers,
  upsertEntityUser,
} from "@/app/lib/server/entities";
import type { EntityUserRole, EntityUserStatus } from "@/domain/entities/types";
import {
  createNonprofitUserDTO,
  deleteNonprofitUserDTO,
  getNonprofitUserDTO,
  listNonprofitUsersDTO,
  updateNonprofitUserDTO,
} from "@/domain/users/nonprofit-users-dto";

interface EntityUsersRouteParams {
  params: Promise<{ id: string }>;
}

export async function handleEntityUsersGet(
  _req: NextRequest,
  context: EntityUsersRouteParams
) {
  const supabase = await getServerClient();

  try {
    const entityId = await parseEntityId(supabase, context.params);
    const users = await getEntityUsers(supabase, entityId);
    return jsonOk(users);
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to load entity users";
    const status = message.toLowerCase().includes("entity not found")
      ? 404
      : 500;
    return jsonError(message, status);
  }
}

export async function handleEntityUsersPost(
  req: NextRequest,
  context: EntityUsersRouteParams
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

  try {
    const entityId = await parseEntityId(supabase, context.params);
    const user = await upsertEntityUser(
      supabase,
      entityId,
      body.userId,
      body.role,
      body.status ?? null,
    );
    return jsonOk(user, { status: 201 });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to update entity user";
    const status = message.toLowerCase().includes("entity not found")
      ? 404
      : 500;
    return jsonError(message, status);
  }
}

export async function handleEntityUsersDelete(
  req: NextRequest,
  context: EntityUsersRouteParams
) {
  const supabase = await getServerClient();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return jsonError("userId is required", 400);
  }

  try {
    const entityId = await parseEntityId(supabase, context.params);
    await deleteEntityUser(supabase, entityId, userId);
    return jsonOk({ success: true });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to delete entity user";
    const status = message.toLowerCase().includes("entity not found")
      ? 404
      : 500;
    return jsonError(message, status);
  }
}

type LegacyEntityUsersPayload = {
  entityId?: string;
  userId?: string;
  role?: EntityUserRole;
};

export async function handleLegacyEntityUsersPost(req: NextRequest) {
  const supabase = await getServerClient();
  const body = (await req.json()) as LegacyEntityUsersPayload;
  const { entityId, userId, role } = body;

  if (!entityId || !userId || !role) {
    return NextResponse.json(
      { error: "entityId, userId, and role are required" },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("entity_users")
    .select("id")
    .eq("entity_id", entityId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("entity_users")
      .update({ role })
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("entity_users")
      .insert({
        entity_id: entityId,
        user_id: userId,
        role,
      });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

export async function handleLegacyEntityUsersDelete(req: NextRequest) {
  const supabase = await getServerClient();
  const body = (await req.json()) as LegacyEntityUsersPayload;
  const { entityId, userId } = body;

  if (!entityId || !userId) {
    return NextResponse.json(
      { error: "entityId and userId are required" },
      { status: 400 },
    );
  }

  try {
    await deleteEntityUser(supabase, entityId, userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete entity user";
    return NextResponse.json(
      {
        error: message.replace(/^Failed to delete entity user: /, ""),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function handleNonprofitUsersGet() {
  return safeRoute(async () => {
    const data = await listNonprofitUsersDTO();
    return NextResponse.json(data);
  });
}

export async function handleNonprofitUsersPost(req: NextRequest) {
  return safeRoute(async () => {
    const body = await req.json();
    const created = await createNonprofitUserDTO(body);
    return NextResponse.json(created, { status: 201 });
  });
}

export async function handleNonprofitUserGet(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return safeRoute(async () => {
    const { id } = await context.params;
    const data = await getNonprofitUserDTO(id);
    return NextResponse.json(data);
  });
}

export async function handleNonprofitUserPatch(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return safeRoute(async () => {
    const { id } = await context.params;
    const body = await req.json();
    const updated = await updateNonprofitUserDTO(id, body);
    return NextResponse.json(updated);
  });
}

export async function handleNonprofitUserDelete(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return safeRoute(async () => {
    const { id } = await context.params;
    await deleteNonprofitUserDTO(id);
    return NextResponse.json({ success: true });
  });
}
