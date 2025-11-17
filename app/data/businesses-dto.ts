import type { Business, BusinessUserJoined } from "@/app/lib/types";
import { createClient } from "@/utils/supabase/server";

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
        .select(`
            *,
            business_users (
                role,
                user:profiles (*)
            )
        `)
        .eq("id", id)
        .maybeSingle();

    if (error || !data) throw error;

    // Map business_users to users for the Business interface
    const businessUsers = Array.isArray(data.business_users)
        ? data.business_users.map((bu: BusinessUserJoined) => ({
            role: bu.role,
            user: bu.user,
        }))
        : [];

    // Return the hydrated Business object
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
        users: businessUsers,
    } as Business;
}

// Insert a new business + associate the current user as owner
export async function registerBusiness(
    userId: string,
    business: Omit<Business, "id" | "created_at" | "updated_at" | "status">,
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

    await supabase.from("business_users").insert({
        business_id: newBusiness.id,
        user_id: userId,
        role: "owner",
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
