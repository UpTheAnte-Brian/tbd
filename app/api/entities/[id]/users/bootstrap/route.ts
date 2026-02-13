import type { NextRequest } from "next/server";
import {
  getServerClient,
  getUserOrThrow,
  jsonError,
  jsonOk,
  parseEntityId,
} from "@/app/lib/server/route-context";
import { isGlobalAdmin } from "@/app/lib/server/rbac";
import { supabaseAdmin } from "@/utils/supabase/service-worker";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await getServerClient();

  let body: { user_id?: string };
  try {
    body = (await req.json()) as { user_id?: string };
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  if (!body.user_id) {
    return jsonError("user_id is required", 400);
  }
  const userId = body.user_id;

  try {
    const entityId = await parseEntityId(supabase, context.params);
    const user = await getUserOrThrow(supabase);
    const isAdmin = await isGlobalAdmin(supabase, user);
    if (!isAdmin) {
      return jsonError("Unauthorized", 403);
    }

    const { data: entity, error: entityError } = await supabaseAdmin
      .from("entities")
      .select("id, entity_type")
      .eq("id", entityId)
      .maybeSingle();

    if (entityError) {
      throw new Error(entityError.message);
    }

    if (!entity || entity.entity_type !== "nonprofit") {
      return jsonError("Bootstrap only allowed for nonprofits", 400);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (!profile?.id) {
      return jsonError("User not found", 404);
    }

    const { count, error: countError } = await supabaseAdmin
      .from("entity_users")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", entityId);

    if (countError) {
      throw new Error(countError.message);
    }

    if ((count ?? 0) > 0) {
      return jsonError("Entity already has users", 409);
    }

    const { error: insertError } = await supabaseAdmin
      .from("entity_users")
      .upsert(
        {
          entity_id: entityId,
        user_id: userId,
        role: "admin",
        status: "active",
        is_primary_admin: true,
      },
      { onConflict: "entity_id,user_id", ignoreDuplicates: true },
      );

    if (insertError) {
      if (insertError.code === "23505") {
        return jsonError("Entity already has a primary admin", 409);
      }
      throw new Error(insertError.message);
    }

    const { count: countAfter, error: countAfterError } = await supabaseAdmin
      .from("entity_users")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", entityId);

    if (countAfterError) {
      throw new Error(countAfterError.message);
    }

    const { data: authUser, error: authUserError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (authUserError) {
      throw new Error(authUserError.message);
    }

    const profileEmail = authUser?.user?.email ?? null;

    let linkedPersonRoleId: string | null = null;

    if (profileEmail) {
      const { data: existingPerson, error: findError } = await supabaseAdmin
        .from("entity_person_roles")
        .select("id, linked_user_id")
        .eq("entity_id", entityId)
        .eq("email", profileEmail)
        .maybeSingle();

      if (findError) {
        throw new Error(findError.message);
      }

      if (existingPerson?.id) {
        linkedPersonRoleId = existingPerson.id;

        if (!existingPerson.linked_user_id) {
          const { error: updateError } = await supabaseAdmin
            .from("entity_person_roles")
            .update({ linked_user_id: userId })
            .eq("id", existingPerson.id);

          if (updateError) {
            throw new Error(updateError.message);
          }
        }
      }
    }

    if (!linkedPersonRoleId) {
      const displayName = profile.full_name ?? "Unknown";
      const sourceRef = `bootstrap:${userId}`;

      const { data: createdPerson, error: insertPersonError } =
        await supabaseAdmin
          .from("entity_person_roles")
          .insert({
            entity_id: entityId,
            source_system: "system",
            source_ref: sourceRef,
            display_name: displayName,
            email: profileEmail,
            linked_user_id: userId,
          })
          .select("id")
          .single();

      if (insertPersonError) {
        throw new Error(insertPersonError.message);
      }

      linkedPersonRoleId = createdPerson.id;
    }

    return jsonOk({
      success: true,
      entity_user_count: countAfter ?? 0,
      user_id: userId,
      linked_person_role_id: linkedPersonRoleId,
    });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Bootstrap failed";
    return jsonError(message, 500);
  }
}
