import type { SupabaseClient } from "@supabase/supabase-js";

const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(value);

export async function resolveDistrictEntityId(
    supabase: SupabaseClient,
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

    if (isUuid(districtKey)) {
        const { data: districtRow, error: districtError } = await supabase
            .from("districts")
            .select("sdorgid, entity_id")
            .eq("id", districtKey)
            .maybeSingle();
        if (districtError) throw districtError;

        if (districtRow?.entity_id) {
            return districtRow.entity_id;
        }

        if (districtRow?.sdorgid) {
            const { data: bySdorgidFromDistrict, error } = await supabase
                .from("entities")
                .select("id")
                .eq("entity_type", "district")
                .eq("external_ids->>sdorgid", districtRow.sdorgid)
                .maybeSingle();
            if (error) throw error;
            if (bySdorgidFromDistrict?.id) return bySdorgidFromDistrict.id;
        }
    }

    throw new Error(`Entity not found for district ${districtKey}`);
}

export async function resolveEntityId(
    supabase: SupabaseClient,
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
