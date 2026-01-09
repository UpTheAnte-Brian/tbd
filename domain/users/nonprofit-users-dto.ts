import "server-only";
import { createClient } from "@/utils/supabase/server";
import type {
    EntityUser,
    EntityUserRole,
    ProfilePreview,
} from "@/domain/entities/types";

export type NonprofitUserDTO = EntityUser & { nonprofit_id: string };

export interface NonprofitUserInput {
    nonprofit_id?: string;
    user_id?: string;
    role?: EntityUserRole;
}

const PROFILE_FIELDS =
    "id, full_name, username, first_name, last_name, avatar_url, website";

function mapProfile(profileRaw: unknown): ProfilePreview | null {
    if (!profileRaw) return null;
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    if (!profile || typeof profile !== "object") return null;

    const {
        id,
        full_name = null,
        username = null,
        first_name = null,
        last_name = null,
        avatar_url = null,
        website = null,
    } = profile as {
        id?: string;
        full_name?: string | null;
        username?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        avatar_url?: string | null;
        website?: string | null;
    };

    if (!id) return null;

    return {
        id: String(id),
        full_name,
        username,
        first_name,
        last_name,
        avatar_url,
        website,
        entity_users: undefined,
    };
}

function mapEntityUser(
    eu: Record<string, unknown>,
): NonprofitUserDTO | null {
    if (!eu.id || !eu.entity_id || !eu.user_id) return null;
    const entityRaw = eu.entities as
        | { entity_type?: string | null }
        | { entity_type?: string | null }[]
        | null
        | undefined;
    const entity = Array.isArray(entityRaw) ? entityRaw[0] : entityRaw;
    return {
        id: String(eu.id),
        entity_type: (entity?.entity_type as EntityUser["entity_type"]) ??
            "nonprofit",
        entity_id: String(eu.entity_id),
        user_id: String(eu.user_id),
        role: (eu.role as EntityUserRole) ?? "viewer",
        status: (eu.status as EntityUser["status"]) ?? null,
        created_at: (eu.created_at as string | null | undefined) ?? null,
        updated_at: null,
        profile: mapProfile(eu.profile),
        nonprofit_id: String(eu.entity_id),
    };
}

export async function listNonprofitUsersDTO(): Promise<NonprofitUserDTO[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("entity_users")
        .select(
            `
      id, entity_id, user_id, role, status, created_at,
      entities:entities ( entity_type ),
      profile:profiles ( ${PROFILE_FIELDS} )
    `,
        )
        .eq("entities.entity_type", "nonprofit")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? [])
        .map((eu) => mapEntityUser(eu as Record<string, unknown>))
        .filter((u): u is NonprofitUserDTO => Boolean(u));
}

export async function getNonprofitUserDTO(
    id: string,
): Promise<NonprofitUserDTO | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("entity_users")
        .select(
            `
      id, entity_id, user_id, role, status, created_at,
      entities:entities ( entity_type ),
      profile:profiles ( ${PROFILE_FIELDS} )
    `,
        )
        .eq("id", id)
        .eq("entities.entity_type", "nonprofit")
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapEntityUser(data as Record<string, unknown>);
}

export async function createNonprofitUserDTO(
    input: NonprofitUserInput,
): Promise<NonprofitUserDTO> {
    if (!input.nonprofit_id || !input.user_id) {
        throw new Error("nonprofit_id and user_id are required");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("entity_users")
        .insert({
            entity_id: input.nonprofit_id,
            user_id: input.user_id,
            role: input.role ?? "viewer",
        })
        .select(
            `
      id, entity_id, user_id, role, status, created_at,
      entities:entities ( entity_type ),
      profile:profiles ( ${PROFILE_FIELDS} )
    `,
        )
        .single();

    if (error) throw error;
    const mapped = mapEntityUser(data as Record<string, unknown>);
    if (!mapped) {
        throw new Error("Failed to map created nonprofit user");
    }
    return mapped;
}

export async function updateNonprofitUserDTO(
    id: string,
    input: NonprofitUserInput,
): Promise<NonprofitUserDTO> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("entity_users")
        .update({
            role: input.role ?? undefined,
        })
        .eq("id", id)
        .select(
            `
      id, entity_id, user_id, role, status, created_at,
      entities:entities ( entity_type ),
      profile:profiles ( ${PROFILE_FIELDS} )
    `,
        )
        .single();

    if (error) throw error;
    const mapped = mapEntityUser(data as Record<string, unknown>);
    if (!mapped) {
        throw new Error("Failed to map updated nonprofit user");
    }
    return mapped;
}

export async function deleteNonprofitUserDTO(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
        .from("entity_users")
        .delete()
        .eq("id", id);
    if (error) throw error;
}
