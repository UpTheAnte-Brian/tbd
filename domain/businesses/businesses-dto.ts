import "server-only";
import type {
    Business,
    EntityUser,
    EntityUserRole,
} from "@/app/lib/types/types";
import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/database.types";

type EntityUserRow = {
    id: string;
    entity_id: string;
    user_id: string;
    role: EntityUserRole;
    status?: EntityUser["status"];
    created_at?: string | null;
    entities?:
        | { entity_type?: EntityUser["entity_type"] | null }[]
        | { entity_type?: EntityUser["entity_type"] | null }
        | null;
    profile?:
        | {
            id: string;
            full_name?: string | null;
            username?: string | null;
            first_name?: string | null;
            last_name?: string | null;
            avatar_url?: string | null;
            website?: string | null;
        }[]
        | {
            id: string;
            full_name?: string | null;
            username?: string | null;
            first_name?: string | null;
            last_name?: string | null;
            avatar_url?: string | null;
            website?: string | null;
        }
        | null;
};

type EntityIdRow = {
    id: string;
    external_ids?: Record<string, unknown> | null;
};

async function mapBusinessEntityIds(
    supabase: Awaited<ReturnType<typeof createClient>>,
    businessIds: string[],
): Promise<Map<string, string>> {
    const entityIdByBusinessId = new Map<string, string>();
    if (businessIds.length === 0) return entityIdByBusinessId;

    const { data: directRows, error: directError } = await supabase
        .from("entities")
        .select("id")
        .eq("entity_type", "business")
        .in("id", businessIds);
    if (directError) throw directError;
    (directRows ?? []).forEach((row) => {
        if (row?.id) {
            entityIdByBusinessId.set(String(row.id), String(row.id));
        }
    });

    const { data: externalRows, error: externalError } = await supabase
        .from("entities")
        .select("id, external_ids")
        .eq("entity_type", "business")
        .in("external_ids->>business_id", businessIds);
    if (externalError) throw externalError;
    (externalRows ?? []).forEach((row) => {
        const externalIds = (row as EntityIdRow).external_ids ?? null;
        const businessId = externalIds?.business_id;
        if (row?.id && typeof businessId === "string") {
            entityIdByBusinessId.set(businessId, String(row.id));
        }
    });

    return entityIdByBusinessId;
}

async function resolveBusinessIdFromEntityId(
    supabase: Awaited<ReturnType<typeof createClient>>,
    entityId: string,
): Promise<string | null> {
    const { data, error } = await supabase
        .from("entities")
        .select("external_ids")
        .eq("entity_type", "business")
        .eq("id", entityId)
        .maybeSingle();
    if (error) throw error;
    const externalIds = (data as EntityIdRow | null)?.external_ids ?? null;
    const businessId = externalIds?.business_id;
    if (typeof businessId === "string") {
        return businessId;
    }
    const placeId = externalIds?.place_id;
    if (typeof placeId !== "string") {
        return null;
    }

    const { data: businessRow, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("place_id", placeId)
        .maybeSingle();
    if (businessError) throw businessError;
    return businessRow?.id ? String(businessRow.id) : null;
}

export async function getBusinesses(): Promise<Business[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("businesses")
        .select(`*`)
        .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    const ids = (data as Business[]).map((r) => String(r.id));
    const entityIdByBusinessId = await mapBusinessEntityIds(supabase, ids);

    return (data as Business[]).map((r) => ({
        id: r.id,
        entity_id: r.entity_id ?? entityIdByBusinessId.get(String(r.id)) ?? null,
        place_id: r.place_id,
        name: r.name,
        address: r.address,
        lat: r.lat,
        lng: r.lng,
        phone_number: r.phone_number,
        website: r.website,
        types: r.types,
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at,
    }));
}

export async function getBusiness(id: string): Promise<Business> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    let business = data ?? null;
    let entityId: string | null = data?.entity_id ?? null;

    if (!business) {
        const { data: entityBusiness, error: entityBusinessError } =
            await supabase
                .from("businesses")
                .select("*")
                .eq("entity_id", id)
                .maybeSingle();
        if (entityBusinessError) throw entityBusinessError;
        if (entityBusiness) {
            business = entityBusiness;
            entityId = id;
        }
    }

    if (!business) {
        const resolvedBusinessId = await resolveBusinessIdFromEntityId(
            supabase,
            id,
        );
        if (resolvedBusinessId) {
            entityId = id;
            const { data: resolvedBusiness, error: resolvedError } =
                await supabase
                    .from("businesses")
                    .select("*")
                    .eq("id", resolvedBusinessId)
                    .maybeSingle();
            if (resolvedError) throw resolvedError;
            business = resolvedBusiness ?? null;
        }
    }

    if (!business) {
        throw new Error("Business not found");
    }

    if (!entityId) {
        const entityMap = await mapBusinessEntityIds(supabase, [
            String(business.id),
        ]);
        entityId = entityMap.get(String(business.id)) ?? null;
    }

    let entityUsers: EntityUser[] = [];
    if (entityId) {
        const { data: userRows, error: usersError } = await supabase
            .from("entity_users")
            .select(
                `
                id,
                entity_id,
                user_id,
                role,
                status,
                created_at,
                entities:entities (
                    entity_type
                ),
                profile:profiles ( id, full_name, username, first_name, last_name, avatar_url, website )
            `,
            )
            .eq("entity_id", entityId);

        if (!usersError && Array.isArray(userRows)) {
            entityUsers = (userRows as EntityUserRow[]).map((u) => {
                const profileRaw = Array.isArray(u.profile)
                    ? u.profile[0]
                    : u.profile;
                const entity = Array.isArray(u.entities)
                    ? u.entities[0]
                    : u.entities;
                return {
                    id: String(u.id),
                    entity_type: entity?.entity_type ?? "business",
                    entity_id: String(u.entity_id),
                    user_id: String(u.user_id),
                    role: (u.role as EntityUserRole) ?? "viewer",
                    status: (u.status as EntityUser["status"]) ?? null,
                    created_at: u.created_at ?? null,
                    updated_at: null,
                    profile: profileRaw
                        ? {
                            id: String((profileRaw as { id: string }).id ?? ""),
                            full_name:
                                (profileRaw as { full_name?: string | null })
                                    .full_name ?? null,
                            username:
                                (profileRaw as { username?: string | null })
                                    .username ?? null,
                            first_name:
                                (profileRaw as { first_name?: string | null })
                                    .first_name ?? null,
                            last_name:
                                (profileRaw as { last_name?: string | null })
                                    .last_name ?? null,
                            avatar_url:
                                (profileRaw as { avatar_url?: string | null })
                                    .avatar_url ?? null,
                            website: (profileRaw as { website?: string | null })
                                .website ?? null,
                            entity_users: undefined,
                        }
                        : null,
                };
            });
        }
    }

    return {
        id: business.id,
        entity_id: entityId ?? null,
        place_id: business.place_id,
        name: business.name,
        address: business.address,
        lat: business.lat,
        lng: business.lng,
        phone_number: business.phone_number,
        website: business.website,
        types: business.types,
        status: business.status,
        created_at: business.created_at,
        updated_at: business.updated_at,
        users: entityUsers,
    } as Business;
}

export async function registerBusiness(
    userId: string,
    business: Omit<
        Business,
        "id" | "created_at" | "updated_at" | "status" | "users"
    >,
) {
    const supabase = await createClient();
    if (!business.entity_id) {
        throw new Error("Business entity_id is required");
    }
    const payload: Database["public"]["Tables"]["businesses"]["Insert"] = {
        ...business,
        entity_id: business.entity_id,
        status: "pending",
    };
    const { data: newBusiness, error } = await supabase
        .from("businesses")
        .insert(payload)
        .select()
        .single();

    if (error) throw error;

    await supabase.from("entity_users").insert({
        entity_id: newBusiness.id,
        user_id: userId,
        role: "admin",
    });

    return newBusiness;
}

export async function approveBusiness(businessId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("businesses")
        .update({ status: "active" })
        .eq("id", businessId);

    if (error) throw error;

    return { success: true };
}

export async function rejectBusiness(businessId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("businesses")
        .update({ status: "inactive" })
        .eq("id", businessId);

    if (error) throw error;

    return { success: true };
}
