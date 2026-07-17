import type { NextRequest } from "next/server";
import {
  getServerClient,
  getUserOrThrow,
  jsonError,
  jsonOk,
  parseEntityId,
} from "@/app/lib/server/route-context";
import { getEntityContactsDTO } from "@/domain/entities/entity-contacts-dto";
import { isGlobalAdmin, requireEntityManager } from "@/app/lib/server/rbac";
import type { Database, Json } from "@/database.types";
import { supabaseAdmin } from "@/utils/supabase/service-worker";

type EntityContactRow = Database["public"]["Tables"]["entity_contacts"]["Row"];

type ContactMutationBody = {
  id?: string;
  name?: string | null;
  contact_role?: string | null;
  email?: string | null;
  phone?: string | null;
  office_label?: string | null;
  relationship_summary?: string | null;
  notes?: string | null;
  tags?: string[] | string | null;
};

type ManualContactMetadata = {
  office_label: string | null;
  relationship_summary: string | null;
  notes: string | null;
  tags: string[];
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeTags(value: ContactMutationBody["tags"]): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter((entry) => entry.length > 0),
      ),
    );
  }

  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(",")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
      ),
    );
  }

  return [];
}

function buildManualMetadata(
  body: ContactMutationBody,
  fallback?: ManualContactMetadata,
): Json | null {
  const metadata: ManualContactMetadata = {
    office_label:
      body.office_label !== undefined
        ? normalizeOptionalString(body.office_label)
        : fallback?.office_label ?? null,
    relationship_summary:
      body.relationship_summary !== undefined
        ? normalizeOptionalString(body.relationship_summary)
        : fallback?.relationship_summary ?? null,
    notes:
      body.notes !== undefined
        ? normalizeOptionalString(body.notes)
        : fallback?.notes ?? null,
    tags:
      body.tags !== undefined
        ? normalizeTags(body.tags)
        : fallback?.tags ?? [],
  };

  const hasValues = Boolean(
    metadata.office_label ||
      metadata.relationship_summary ||
      metadata.notes ||
      metadata.tags.length > 0,
  );

  return hasValues ? (metadata as Json) : null;
}

function parseManualMetadata(raw: Json | null): ManualContactMetadata {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      office_label: null,
      relationship_summary: null,
      notes: null,
      tags: [],
    };
  }

  const record = raw as Record<string, unknown>;

  return {
    office_label: normalizeOptionalString(record.office_label),
    relationship_summary: normalizeOptionalString(record.relationship_summary),
    notes: normalizeOptionalString(record.notes),
    tags: normalizeTags(Array.isArray(record.tags) ? record.tags : []),
  };
}

function getRouteErrorStatus(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("unauthorized")) return 403;
  if (lower.includes("not found")) return 404;
  return 500;
}

async function requireWriteAccess(context: { params: Promise<{ id: string }> }) {
  const supabase = await getServerClient();
  const user = await getUserOrThrow(supabase);
  const entityId = await parseEntityId(supabase, context.params);
  const globalAdmin = await isGlobalAdmin(supabase, user);
  if (!globalAdmin) {
    await requireEntityManager({ supabase, userId: user.id, entityId });
  }
  return { entityId, user };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await getServerClient();

  try {
    await getUserOrThrow(supabase);
    const entityId = await parseEntityId(supabase, context.params);
    const role = request.nextUrl.searchParams.get("role");
    const response = await getEntityContactsDTO(entityId, role);
    return jsonOk(response);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load contacts";
    return jsonError(message, getRouteErrorStatus(message));
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  let body: ContactMutationBody;

  try {
    body = (await request.json()) as ContactMutationBody;
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const name = normalizeOptionalString(body.name);
  const contactRole = normalizeOptionalString(body.contact_role);
  const email = normalizeEmail(body.email);
  const phone = normalizeOptionalString(body.phone);

  if (!contactRole) {
    return jsonError("contact_role is required", 400);
  }

  if (!name && !email) {
    return jsonError("Provide at least a name or email", 400);
  }

  try {
    const { entityId } = await requireWriteAccess(context);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const insert: Database["public"]["Tables"]["entity_contacts"]["Insert"] = {
      id,
      entity_id: entityId,
      contact_role: contactRole,
      name,
      email,
      phone,
      source_system: "manual",
      source_formid: `manual:${id}`,
      source_url: `/entities/${entityId}?tab=contacts`,
      first_seen_at: now,
      last_seen_at: now,
      raw: buildManualMetadata(body),
    };

    const { error } = await supabaseAdmin.from("entity_contacts").insert(insert);
    if (error) {
      throw new Error(error.message);
    }

    return jsonOk({ success: true, id }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create contact";
    return jsonError(message, getRouteErrorStatus(message));
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  let body: ContactMutationBody;

  try {
    body = (await request.json()) as ContactMutationBody;
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  if (!body.id) {
    return jsonError("id is required", 400);
  }

  try {
    const { entityId } = await requireWriteAccess(context);

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("entity_contacts")
      .select("*")
      .eq("id", body.id)
      .eq("entity_id", entityId)
      .returns<EntityContactRow[]>()
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (!existing) {
      return jsonError("Contact not found", 404);
    }

    if (existing.source_system !== "manual") {
      return jsonError("Only manual contacts can be edited", 400);
    }

    const updates: Database["public"]["Tables"]["entity_contacts"]["Update"] = {
      last_seen_at: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      updates.name = normalizeOptionalString(body.name);
    }
    if (body.contact_role !== undefined) {
      const role = normalizeOptionalString(body.contact_role);
      if (!role) {
        return jsonError("contact_role is required", 400);
      }
      updates.contact_role = role;
    }
    if (body.email !== undefined) {
      updates.email = normalizeEmail(body.email);
    }
    if (body.phone !== undefined) {
      updates.phone = normalizeOptionalString(body.phone);
    }
    if (
      body.office_label !== undefined ||
      body.relationship_summary !== undefined ||
      body.notes !== undefined ||
      body.tags !== undefined
    ) {
      updates.raw = buildManualMetadata(body, parseManualMetadata(existing.raw));
    }

    const nextName = updates.name !== undefined ? updates.name : existing.name;
    const nextEmail = updates.email !== undefined ? updates.email : existing.email;
    if (!nextName && !nextEmail) {
      return jsonError("Provide at least a name or email", 400);
    }

    const { error: updateError } = await supabaseAdmin
      .from("entity_contacts")
      .update(updates)
      .eq("id", body.id)
      .eq("entity_id", entityId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return jsonOk({ success: true, id: body.id });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update contact";
    return jsonError(message, getRouteErrorStatus(message));
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const contactId = request.nextUrl.searchParams.get("contactId");
  if (!contactId) {
    return jsonError("contactId is required", 400);
  }

  try {
    const { entityId } = await requireWriteAccess(context);

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("entity_contacts")
      .select("id, source_system")
      .eq("id", contactId)
      .eq("entity_id", entityId)
      .returns<Array<{ id: string; source_system: string }>>()
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (!existing) {
      return jsonError("Contact not found", 404);
    }

    if (existing.source_system !== "manual") {
      return jsonError("Only manual contacts can be deleted", 400);
    }

    const { error } = await supabaseAdmin
      .from("entity_contacts")
      .delete()
      .eq("id", contactId)
      .eq("entity_id", entityId);

    if (error) {
      throw new Error(error.message);
    }

    return jsonOk({ success: true, id: contactId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete contact";
    return jsonError(message, getRouteErrorStatus(message));
  }
}
