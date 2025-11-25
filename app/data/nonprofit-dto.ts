// app/data/nonprofit-dto.ts

import { createClient } from "@/utils/supabase/server";
import {
    FoundationMetadata,
    Nonprofit,
    OrgType,
} from "@/app/lib/types/nonprofits";

/**
 * DTO returned to UI.
 * - merges nonprofit + metadata
 * - UI never sees "foundation_metadata" table directly
 */
export interface NonprofitDTO extends Nonprofit {
    foundation_metadata: FoundationMetadata | null;
}

/**
 * Fetch a nonprofit by ID.
 */
export async function getNonprofitDTO(id: string): Promise<NonprofitDTO> {
    const supabase = await createClient();

    const { data: nonprofit, error: nonprofitError } = await supabase
        .from("nonprofits")
        .select("*")
        .eq("id", id)
        .single();

    if (nonprofitError || !nonprofit) {
        throw new Error(nonprofitError?.message ?? "Nonprofit not found");
    }

    const { data: metadata, error: metadataError } = await supabase
        .from("foundation_metadata")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (metadataError) {
        throw new Error(metadataError.message);
    }

    return { ...nonprofit, foundation_metadata: metadata };
}

/**
 * List nonprofits with optional filters.
 * (filters: org_type, district_id, active)
 */
export async function listNonprofitDTO(filters?: {
    org_type?: OrgType;
    district_id?: string;
    active?: boolean;
}): Promise<NonprofitDTO[]> {
    const supabase = await createClient();

    let query = supabase.from("nonprofits").select("*");

    if (filters?.org_type) {
        query = query.eq("org_type", filters.org_type);
    }

    if (filters?.district_id) {
        query = query.eq("district_id", filters.district_id);
    }

    if (filters?.active !== undefined) {
        query = query.eq("active", filters.active);
    }

    const { data: nonprofits, error } = await query.order("name");

    if (error) {
        throw new Error(error.message);
    }

    if (!nonprofits) return [];

    // Fetch metadata for all nonprofits
    const ids = nonprofits.map((n) => n.id);

    const { data: metadataRows, error: mdError } = await supabase
        .from("foundation_metadata")
        .select("*")
        .in("id", ids);

    if (mdError) {
        throw new Error(mdError.message);
    }

    const metadataMap = new Map<string, FoundationMetadata>();
    metadataRows?.forEach((m: FoundationMetadata) => metadataMap.set(m.id, m));

    return nonprofits.map((np) => ({
        ...np,
        foundation_metadata: metadataMap.get(np.id) ?? null,
    }));
}

/**
 * District foundation lookup:
 * Every district SHOULD have exactly one district foundation nonprofit.
 */
export async function getDistrictFoundationDTO(
    districtId: string,
): Promise<NonprofitDTO | null> {
    const supabase = await createClient();

    const { data: nonprofit, error } = await supabase
        .from("nonprofits")
        .select("*")
        .eq("district_id", districtId)
        .eq("org_type", "district_foundation")
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!nonprofit) return null;

    const { data: metadata } = await supabase
        .from("foundation_metadata")
        .select("*")
        .eq("id", nonprofit.id)
        .maybeSingle();

    return { ...nonprofit, foundation_metadata: metadata ?? null };
}

/**
 * Create a nonprofit
 */
export async function createNonprofitDTO(
    payload: Partial<Nonprofit>,
): Promise<NonprofitDTO> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("nonprofits")
        .insert(payload)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    // Create an empty metadata row if needed
    if (data.org_type === "district_foundation") {
        await ensureFoundationMetadataRow(data.id);
    }

    return getNonprofitDTO(data.id);
}

/**
 * Update a nonprofit by ID
 */
export async function updateNonprofitDTO(
    id: string,
    payload: Partial<Nonprofit>,
): Promise<NonprofitDTO> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("nonprofits")
        .update(payload)
        .eq("id", id);

    if (error) {
        throw new Error(error.message);
    }

    return getNonprofitDTO(id);
}

/**
 * Upsert district foundation (used during initial district setup)
 */
export async function upsertDistrictFoundationDTO(
    districtId: string,
    fields: Partial<Nonprofit>,
): Promise<NonprofitDTO> {
    const existing = await getDistrictFoundationDTO(districtId);

    if (existing) {
        // Update
        return updateNonprofitDTO(existing.id, fields);
    }

    // Create
    const created = await createNonprofitDTO({
        ...fields,
        org_type: "district_foundation",
        district_id: districtId,
    });

    return created;
}

/**
 * Makes sure metadata exists for district foundations
 */
async function ensureFoundationMetadataRow(nonprofitId: string) {
    const supabase = await createClient();

    const { data } = await supabase
        .from("foundation_metadata")
        .select("id")
        .eq("id", nonprofitId)
        .maybeSingle();

    if (!data) {
        await supabase.from("foundation_metadata").insert({
            id: nonprofitId,
            director: null,
            endowment_amount: null,
            grantmaking_focus: null,
            additional_info: null,
        });
    }
}
