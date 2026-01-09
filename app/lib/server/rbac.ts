import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";

type AuthUser = { id: string } | null | undefined;

type EntityScope = {
  supabase: SupabaseClient<Database>;
  userId: string;
  entityId: string;
};

export async function isGlobalAdmin(
  supabase: SupabaseClient<Database>,
  user?: AuthUser
): Promise<boolean> {
  try {
    const authUser = user ?? (await supabase.auth.getUser()).data.user;
    if (!authUser) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) return false;
    return data?.role === "admin";
  } catch {
    return false;
  }
}

export async function requireGlobalAdmin(
  supabase: SupabaseClient<Database>,
  user?: AuthUser
) {
  const ok = await isGlobalAdmin(supabase, user);
  if (!ok) {
    throw new Error("Unauthorized");
  }
}

export async function requireEntityAdmin({
  supabase,
  userId,
  entityId,
}: EntityScope) {
  const { data, error } = await supabase
    .from("entity_users")
    .select("role")
    .eq("entity_id", entityId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check entity_users: ${error.message}`);
  }

  if (!data || data.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function requireBoardMember({
  supabase,
  userId,
  entityId,
}: EntityScope) {
  const { data: boards, error: boardError } = await supabase
    .schema("governance")
    .from("boards")
    .select("id")
    .eq("entity_id", entityId);

  if (boardError) {
    throw new Error(`Failed to load boards: ${boardError.message}`);
  }

  const boardIds = (boards ?? []).map((board) => board.id);
  if (!boardIds.length) {
    throw new Error("Unauthorized");
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: member, error: memberError } = await supabase
    .schema("governance")
    .from("board_members")
    .select("id")
    .eq("user_id", userId)
    .in("board_id", boardIds)
    .lte("term_start", today)
    .or(`term_end.is.null,term_end.gt.${today}`)
    .maybeSingle();

  if (memberError) {
    throw new Error(`Failed to check board members: ${memberError.message}`);
  }

  if (!member) {
    throw new Error("Unauthorized");
  }
}
