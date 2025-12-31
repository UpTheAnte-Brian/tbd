import "server-only";
import type {
    Business,
    EntityUser,
    EntityUserRole,
} from "@/app/lib/types/types";
import { createClient } from "@/utils/supabase/server";

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

export async function getBusinesses(): Promise<Business[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("businesses")
        .select(`*`)
        .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return (data as Business[]).map((r) => ({
        id: r.id,
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

    if (error || !data) {
        throw error ?? new Error("Business not found");
    }

    let entityUsers: EntityUser[] = [];
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
        .eq("entity_id", data.id);

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

    return {
        id: data.id,
        place_id: data.place_id,
        name: data.name,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        phone_number: data.phone_number,
        website: data.website,
        types: data.types,
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at,
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
    const { data: newBusiness, error } = await supabase
        .from("businesses")
        .insert({
            ...business,
            status: "pending",
        })
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
