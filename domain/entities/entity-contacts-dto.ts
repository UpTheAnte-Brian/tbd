import "server-only";

import { createApiClient } from "@/utils/supabase/route";
import type { SupabaseClient } from "@supabase/supabase-js";

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
};

export type EntityContactsResponse = {
    entity_id: string;
    role: string | null;
    contacts: EntityContactSummary[];
};

type EntityContactRow = {
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
};

function mapContact(row: EntityContactRow): EntityContactSummary {
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
    };
}

export async function getEntityContactsDTO(
    entityId: string,
    role?: string | null,
): Promise<EntityContactsResponse> {
    const supabase = (await createApiClient()) as SupabaseClient;

    let query = supabase
        .from("entity_contacts" as any)
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
