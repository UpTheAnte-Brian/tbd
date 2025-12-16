import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

type Payload = {
  entityType?: "district" | "business" | "nonprofit";
  entityId?: string;
  userId?: string;
  role?: "admin" | "editor" | "viewer" | "employee";
};

// Upsert/update role
export async function POST(req: NextRequest) {
  const supabase = await createApiClient();
  const body = (await req.json()) as Payload;
  const { entityType, entityId, userId, role } = body;

  if (!entityType || !entityId || !userId || !role) {
    return NextResponse.json(
      { error: "entityType, entityId, userId, and role are required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("entity_users")
    .upsert(
      {
        entity_type: entityType,
        entity_id: entityId,
        user_id: userId,
        role,
      },
      { onConflict: "entity_id,user_id,entity_type" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Delete role
export async function DELETE(req: NextRequest) {
  const supabase = await createApiClient();
  const body = (await req.json()) as Payload;
  const { entityType, entityId, userId } = body;

  if (!entityType || !entityId || !userId) {
    return NextResponse.json(
      { error: "entityType, entityId, and userId are required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("entity_users")
    .delete()
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
