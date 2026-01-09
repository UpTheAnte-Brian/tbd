// CANONICAL: Entity-scoped users endpoint.
import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";
import {
  deleteEntityUser,
  getEntityUsers,
  upsertEntityUser,
} from "@/app/lib/server/entities";
import type { EntityUserRole, EntityUserStatus } from "@/app/lib/types/types";

// GET /api/entities/[id]/users
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createApiClient();
  const { id: entityKey } = await context.params;

  try {
    const entityId = await resolveEntityId(supabase, entityKey);
    const users = await getEntityUsers(supabase, entityId);
    return NextResponse.json(users);
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to load entity users";
    const status = message.toLowerCase().includes("entity not found")
      ? 404
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/entities/[id]/users
// Body: { userId, role, status? }
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createApiClient();
  const { id: entityKey } = await context.params;

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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.userId || !body.role) {
    return NextResponse.json(
      { error: "userId and role are required" },
      { status: 400 },
    );
  }

  // Defensive validation in case callers send arbitrary strings
  const allowedStatuses: ReadonlySet<EntityUserStatus> = new Set([
    "active",
    "invited",
    "removed",
  ]);
  if (body.status != null && !allowedStatuses.has(body.status)) {
    return NextResponse.json(
      { error: "status must be one of: active, invited, removed" },
      { status: 400 },
    );
  }

  try {
    const entityId = await resolveEntityId(supabase, entityKey);
    const user = await upsertEntityUser(
      supabase,
      entityId,
      body.userId,
      body.role,
      body.status ?? null,
    );
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to update entity user";
    const status = message.toLowerCase().includes("entity not found")
      ? 404
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/entities/[id]/users?userId=...
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createApiClient();
  const { id: entityKey } = await context.params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const entityId = await resolveEntityId(supabase, entityKey);
    await deleteEntityUser(supabase, entityId, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to delete entity user";
    const status = message.toLowerCase().includes("entity not found")
      ? 404
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
