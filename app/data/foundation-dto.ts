import "server-only";
import { createClient } from "../../utils/supabase/server";
import { Foundation } from "@/app/lib/types";

export async function getFoundationDTO(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("foundations")
        .select("*")
        .eq("district_id", id)
        .single();

    return { data, error };
}

export async function getFoundationsDTO() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("foundations")
        .select("*");

    return { data, error };
}

export async function upsertFoundationDTO(
    district_id: string,
    foundation: Foundation,
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("foundations")
        .upsert([{ ...foundation, district_id }], {
            onConflict: "district_id",
        })
        .select()
        .single();

    return { data, error };
}
