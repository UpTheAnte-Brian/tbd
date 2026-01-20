import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";

export async function resolveDistrictEntityId(
    supabase: SupabaseClient<Database>,
    districtKey: string,
): Promise<string> {
    const { data: directEntity, error: directEntityError } = await supabase
        .from("entities")
        .select("id")
        .eq("id", districtKey)
        .eq("entity_type", "district")
        .maybeSingle();
    if (directEntityError) throw directEntityError;
    if (directEntity?.id) return directEntity.id;

    const { data: byDistrictId, error: byDistrictIdError } = await supabase
        .from("entities")
        .select("id")
        .eq("entity_type", "district")
        .eq("external_ids->>district_id", districtKey)
        .maybeSingle();
    if (byDistrictIdError) throw byDistrictIdError;
    if (byDistrictId?.id) return byDistrictId.id;

    const { data: bySdorgid, error: bySdorgidError } = await supabase
        .from("entities")
        .select("id")
        .eq("entity_type", "district")
        .eq("external_ids->>sdorgid", districtKey)
        .maybeSingle();
    if (bySdorgidError) throw bySdorgidError;
    if (bySdorgid?.id) return bySdorgid.id;

    throw new Error(`Entity not found for district ${districtKey}`);
}

export async function resolveEntityId(
    supabase: SupabaseClient<Database>,
    entityKey: string,
): Promise<string> {
    const { data: directEntity, error: directEntityError } = await supabase
        .from("entities")
        .select("id")
        .eq("id", entityKey)
        .maybeSingle();
    if (directEntityError) throw directEntityError;
    if (directEntity?.id) return directEntity.id;

    try {
        return await resolveDistrictEntityId(supabase, entityKey);
    } catch {
        throw new Error(`Entity not found for id ${entityKey}`);
    }
}
