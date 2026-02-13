import type { NextRequest } from "next/server";
import {
  getServerClient,
  getUserOrThrow,
  jsonError,
  jsonOk,
  parseEntityId,
} from "@/app/lib/server/route-context";
import { isGlobalAdmin, requireEntityAdmin } from "@/app/lib/server/rbac";
import type { Database } from "@/database.types";
import { supabaseAdmin } from "@/utils/supabase/service-worker";

type PeopleRow = Database["public"]["Tables"]["entity_person_roles"]["Row"];
type InviteRow = Database["public"]["Tables"]["entity_user_invites"]["Row"];
type EntityUserRow = Database["public"]["Tables"]["entity_users"]["Row"];
type PeopleAccessRow = PeopleRow & {
  access_role: EntityUserRow["role"] | null;
  is_primary_admin: boolean | null;
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await getServerClient();

  try {
    const entityId = await parseEntityId(supabase, context.params);
    const user = await getUserOrThrow(supabase);
    const globalAdmin = await isGlobalAdmin(supabase, user);
    if (!globalAdmin) {
      await requireEntityAdmin({ supabase, userId: user.id, entityId });
    }

    const { data: people, error: peopleError } = await supabase
      .from("entity_person_roles")
      .select(
        [
          "id",
          "entity_id",
          "display_name",
          "role_title",
          "is_officer",
          "tax_year",
          "reportable_compensation",
          "other_compensation",
          "email",
          "phone",
          "linked_user_id",
          "invite_status",
          "invited_at",
          "joined_at",
          "created_at",
          "updated_at",
        ].join(", "),
      )
      .eq("entity_id", entityId)
      .order("is_officer", { ascending: false, nullsFirst: false })
      .order("display_name", { ascending: true, nullsFirst: false })
      .returns<PeopleRow[]>();

    if (peopleError) {
      throw new Error(peopleError.message);
    }

    const { data: invites, error: invitesError } = await supabase
      .from("entity_user_invites")
      .select(
        [
          "id",
          "entity_id",
          "entity_person_role_id",
          "email",
          "desired_role",
          "status",
          "invited_at",
          "accepted_at",
          "expires_at",
          "invited_by",
        ].join(", "),
      )
      .eq("entity_id", entityId)
      .order("invited_at", { ascending: false })
      .returns<InviteRow[]>();

    if (invitesError) {
      throw new Error(invitesError.message);
    }

    const linkedUserIds = Array.from(
      new Set(
        (people ?? [])
          .map((person) => person.linked_user_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const accessByUserId = new Map<
      string,
      { role: EntityUserRow["role"]; is_primary_admin: boolean }
    >();

    if (linkedUserIds.length > 0) {
      const { data: accessRows, error: accessError } = await supabaseAdmin
        .from("entity_users")
        .select("user_id, role, is_primary_admin")
        .eq("entity_id", entityId)
        .in("user_id", linkedUserIds);

      if (accessError) {
        throw new Error(accessError.message);
      }

      (accessRows ?? []).forEach((row) => {
        accessByUserId.set(row.user_id, {
          role: row.role,
          is_primary_admin: Boolean(row.is_primary_admin),
        });
      });
    }

    const peopleWithAccess: PeopleAccessRow[] = (people ?? []).map((person) => {
      const access = person.linked_user_id
        ? accessByUserId.get(person.linked_user_id)
        : null;
      return {
        ...person,
        access_role: access?.role ?? null,
        is_primary_admin: access ? access.is_primary_admin : null,
      };
    });

    const { count: entityUserCount, error: countError } = await supabaseAdmin
      .from("entity_users")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", entityId);

    if (countError) {
      throw new Error(countError.message);
    }

    return jsonOk({
      people: peopleWithAccess,
      invites: invites ?? [],
      entity_user_count: entityUserCount ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to load people";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 403
      : lower.includes("entity not found")
      ? 404
      : 500;
    return jsonError(message, status);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await getServerClient();

  let body: {
    id?: string;
    email?: string | null;
    phone?: string | null;
    linkedUserId?: string | null;
  };

  try {
    body = (await req.json()) as {
      id?: string;
      email?: string | null;
      phone?: string | null;
      linkedUserId?: string | null;
    };
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  if (!body.id) {
    return jsonError("id is required", 400);
  }

  const email = typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : body.email ?? null;
  const phone = typeof body.phone === "string" ? body.phone.trim() : null;
  const linkedUserId = typeof body.linkedUserId === "string"
    ? body.linkedUserId
    : null;

  try {
    const entityId = await parseEntityId(supabase, context.params);
    const user = await getUserOrThrow(supabase);
    const globalAdmin = await isGlobalAdmin(supabase, user);
    if (!globalAdmin) {
      await requireEntityAdmin({ supabase, userId: user.id, entityId });
    }

    const { data: existing, error: existingError } = await supabase
      .from("entity_person_roles")
      .select("invite_status")
      .eq("id", body.id)
      .eq("entity_id", entityId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (!existing) {
      return jsonError("Person role not found", 404);
    }

    const updates:
      Database["public"]["Tables"]["entity_person_roles"]["Update"] = {};
    if (body.email !== undefined) {
      updates.email = email && email.length > 0 ? email : null;
      if (updates.email && existing.invite_status === "none") {
        updates.invite_status = "ready";
      }
    }
    if (body.phone !== undefined) {
      updates.phone = phone && phone.length > 0 ? phone : null;
    }
    if (linkedUserId) {
      updates.linked_user_id = linkedUserId;
    }

    if (Object.keys(updates).length === 0) {
      return jsonError("No updates provided", 400);
    }

    const { data: updated, error: updateError } = await supabase
      .from("entity_person_roles")
      .update(updates)
      .eq("id", body.id)
      .eq("entity_id", entityId)
      .select("*")
      .single()
      .returns<PeopleRow>();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return jsonOk({ person: updated });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to update person";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 403
      : lower.includes("not found")
      ? 404
      : 500;
    return jsonError(message, status);
  }
}
