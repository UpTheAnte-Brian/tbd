import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

type Payload = {
  entityId?: string;
  userId?: string;
  role?: "admin" | "editor" | "viewer" | "employee";
};

// Upsert/update role
export async function POST(req: NextRequest) {
  const supabase = await createApiClient();
  const body = (await req.json()) as Payload;
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

// Delete role
export async function DELETE(req: NextRequest) {
  const supabase = await createApiClient();
  const body = (await req.json()) as Payload;
  const { entityId, userId } = body;

  if (!entityId || !userId) {
    return NextResponse.json(
      { error: "entityId and userId are required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("entity_users")
    .delete()
    .eq("entity_id", entityId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
