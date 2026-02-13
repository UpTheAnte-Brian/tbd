import "server-only";

import crypto from "crypto";
import type { Database } from "@/database.types";
import type { EntityUserRole } from "@/domain/entities/types";
import { supabaseAdmin, createIrsAdminClient } from "@/utils/supabase/service-worker";

type PostgrestMaybeSingleError = {
  code?: string;
  status?: number;
  message?: string;
} | null;

const isNotFoundError = (error: PostgrestMaybeSingleError) =>
  error?.code === "PGRST116" || error?.status === 406;

function normalizeEin(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length === 9 ? digits : null;
}

export async function materializeEntityPeople(params: {
  entityId: string;
  ein: string;
}) {
  const normalizedEin = normalizeEin(params.ein);
  if (!normalizedEin) return;

  const irs = createIrsAdminClient();

  const { data: latestReturn, error: latestReturnError } = await irs
    .from("latest_returns")
    .select("id, tax_year")
    .eq("ein", normalizedEin)
    .maybeSingle();

  if (latestReturnError && !isNotFoundError(latestReturnError)) {
    throw new Error(latestReturnError.message);
  }

  const returnId = latestReturn?.id;
  if (!returnId) return;

  const { data: people, error: peopleError } = await irs
    .from("return_people")
    .select(
      "id, name, title, role, reportable_compensation, other_compensation",
    )
    .eq("return_id", returnId);

  if (peopleError) {
    throw new Error(peopleError.message);
  }

  if (!people?.length) return;

  const payload: Database["public"]["Tables"]["entity_person_roles"]["Insert"][] =
    people.map((person) => ({
      entity_id: params.entityId,
      source_system: "irs",
      source_ref: `return_people:${person.id}`,
      display_name: person.name,
      role_title: person.title ?? null,
      is_officer: person.role === "officer",
      tax_year: latestReturn?.tax_year ?? null,
      reportable_compensation: person.reportable_compensation ?? null,
      other_compensation: person.other_compensation ?? null,
    }));

  const { error: upsertError } = await supabaseAdmin
    .from("entity_person_roles")
    .upsert(payload, {
      onConflict: "entity_id,source_system,source_ref",
      ignoreDuplicates: false,
    });

  if (upsertError) {
    throw new Error(upsertError.message);
  }
}

export async function createEntityUserInvite(params: {
  entityId: string;
  email: string;
  desiredRole: EntityUserRole;
  entityPersonRoleId?: string | null;
  invitedBy: string;
}) {
  const email = params.email.trim().toLowerCase();
  if (!email) {
    throw new Error("email is required");
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from("entity_user_invites")
    .insert({
      entity_id: params.entityId,
      entity_person_role_id: params.entityPersonRoleId ?? null,
      email,
      desired_role: params.desiredRole,
      token_hash: tokenHash,
      invited_by: params.invitedBy,
      expires_at: expiresAt.toISOString(),
    })
    .select("id, entity_id, email, desired_role, expires_at")
    .single();

  if (inviteError) {
    throw new Error(inviteError.message);
  }

  const invitedAt = new Date().toISOString();
  if (params.entityPersonRoleId) {
    const { error: roleError } = await supabaseAdmin
      .from("entity_person_roles")
      .update({
        invite_status: "invited",
        invited_at: invitedAt,
      })
      .eq("id", params.entityPersonRoleId)
      .eq("entity_id", params.entityId);

    if (roleError) {
      throw new Error(roleError.message);
    }
  }

  return {
    inviteId: invite.id,
    entityId: invite.entity_id,
    email: invite.email,
    desiredRole: invite.desired_role,
    expiresAt: invite.expires_at,
    token: rawToken,
  };
}

export async function acceptEntityUserInvite(params: {
  token: string;
  userId: string;
  userEmail?: string | null;
}) {
  const token = params.token.trim();
  if (!token) {
    throw new Error("token is required");
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from("entity_user_invites")
    .select(
      "id, entity_id, entity_person_role_id, email, desired_role, expires_at, status",
    )
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .maybeSingle();

  if (inviteError && !isNotFoundError(inviteError)) {
    throw new Error(inviteError.message);
  }

  if (!invite) {
    throw new Error("Invalid or expired invite");
  }

  const now = new Date();
  const expiresAt = invite.expires_at ? new Date(invite.expires_at) : null;
  if (expiresAt && Number.isFinite(expiresAt.getTime()) && expiresAt < now) {
    await supabaseAdmin
      .from("entity_user_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);
    throw new Error("Invite expired");
  }

  const inviteEmail = invite.email?.toLowerCase();
  const userEmail = params.userEmail?.toLowerCase();
  if (inviteEmail && userEmail && inviteEmail !== userEmail) {
    throw new Error("Invite email does not match authenticated user");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", params.userId)
    .maybeSingle();

  if (profileError && !isNotFoundError(profileError)) {
    throw new Error(profileError.message);
  }

  if (!profile?.id) {
    const { error: createProfileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: params.userId,
        updated_at: new Date().toISOString(),
      });

    if (createProfileError) {
      throw new Error(createProfileError.message);
    }
  }

  const shouldTryPrimaryAdmin = invite.desired_role === "admin";
  let entityUserError: { message: string; code?: string } | null = null;

  const attemptUpsert = async (isPrimaryAdmin: boolean) => {
    const { error } = await supabaseAdmin
      .from("entity_users")
      .upsert(
        {
          entity_id: invite.entity_id,
          user_id: params.userId,
          role: invite.desired_role,
          status: "active",
          is_primary_admin: isPrimaryAdmin,
        },
        { onConflict: "entity_id,user_id" },
      );
    return error;
  };

  if (shouldTryPrimaryAdmin) {
    const error = await attemptUpsert(true);
    if (error) {
      if (error.code === "23505") {
        entityUserError = await attemptUpsert(false);
      } else {
        entityUserError = error;
      }
    }
  } else {
    entityUserError = await attemptUpsert(false);
  }

  if (entityUserError) {
    throw new Error(entityUserError.message);
  }

  const acceptedAt = new Date().toISOString();
  const { error: inviteUpdateError } = await supabaseAdmin
    .from("entity_user_invites")
    .update({
      status: "accepted",
      accepted_at: acceptedAt,
    })
    .eq("id", invite.id);

  if (inviteUpdateError) {
    throw new Error(inviteUpdateError.message);
  }

  if (invite.entity_person_role_id) {
    const { error: roleUpdateError } = await supabaseAdmin
      .from("entity_person_roles")
      .update({
        linked_user_id: params.userId,
        invite_status: "joined",
        joined_at: acceptedAt,
      })
      .eq("id", invite.entity_person_role_id)
      .eq("entity_id", invite.entity_id);

    if (roleUpdateError) {
      throw new Error(roleUpdateError.message);
    }
  }

  return {
    inviteId: invite.id,
    entityId: invite.entity_id,
    role: invite.desired_role,
  };
}
