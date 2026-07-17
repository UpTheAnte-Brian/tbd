import "server-only";

import { createApiClient } from "@/utils/supabase/route";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/database.types";

type EntityContactRow = Database["public"]["Tables"]["entity_contacts"]["Row"];

type ContactMetadata = {
    office_label?: unknown;
    relationship_summary?: unknown;
    notes?: unknown;
    tags?: unknown;
};

type NormalizedContactMetadata = {
    office_label: string | null;
    relationship_summary: string | null;
    notes: string | null;
    tags: string[];
};

export type EntityContactSummary = {
    id: string;
    contact_role: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    source_system: string;
    source_formid: string;
    source_url: string;
    first_seen_at: string;
    last_seen_at: string;
    office_label: string | null;
    relationship_summary: string | null;
    notes: string | null;
    tags: string[];
    is_manual: boolean;
};

export type EntityContactsResponse = {
    entity_id: string;
    role: string | null;
    contacts: EntityContactSummary[];
};

function normalizeOptionalString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function parseTags(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    const tags = value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter((entry) => entry.length > 0);

    return Array.from(new Set(tags));
}

function parseMetadata(raw: Json | null): NormalizedContactMetadata {
    const metadata =
        raw && typeof raw === "object" && !Array.isArray(raw)
            ? (raw as ContactMetadata)
            : {};

    return {
        office_label: normalizeOptionalString(metadata.office_label),
        relationship_summary: normalizeOptionalString(
            metadata.relationship_summary,
        ),
        notes: normalizeOptionalString(metadata.notes),
        tags: parseTags(metadata.tags),
    };
}

function mapContact(row: EntityContactRow): EntityContactSummary {
    const metadata = parseMetadata(row.raw);
    return {
        id: String(row.id),
        contact_role: row.contact_role,
        name: row.name ?? null,
        email: row.email ?? null,
        phone: row.phone ?? null,
        source_system: row.source_system,
        source_formid: row.source_formid,
        source_url: row.source_url,
        first_seen_at: row.first_seen_at,
        last_seen_at: row.last_seen_at,
        office_label: metadata.office_label,
        relationship_summary: metadata.relationship_summary,
        notes: metadata.notes,
        tags: metadata.tags,
        is_manual: row.source_system === "manual",
    };
}

export async function getEntityContactsDTO(
    entityId: string,
    role?: string | null,
): Promise<EntityContactsResponse> {
    const supabase = (await createApiClient()) as SupabaseClient;

    let query = supabase
        .from("entity_contacts")
        .select(
            "id, contact_role, name, email, phone, source_system, source_formid, source_url, first_seen_at, last_seen_at",
        )
        .eq("entity_id", entityId)
        .eq("is_current", true)
        .order("last_seen_at", { ascending: false });

    const normalizedRole = role?.trim();
    if (normalizedRole) {
        query = query.eq("contact_role", normalizedRole);
    }

    const { data, error } = await query;
    if (error) {
        throw new Error(error.message);
    }

    const contacts = (data ?? []).map((row) =>
        mapContact(row as EntityContactRow),
    );

    return {
        entity_id: entityId,
        role: normalizedRole ?? null,
        contacts,
    };
}
