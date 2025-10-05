import type { Business } from "@/app/lib/types";
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
