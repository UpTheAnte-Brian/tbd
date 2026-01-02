// app/data/nonprofit-dto.ts
import "server-only";
import { createApiClient } from "@/utils/supabase/route";
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

async function resolveNonprofitEntityIdByNonprofitId(
    nonprofitId: string,
) : Promise<string | null> {
    const supabase = await createApiClient();

    const { data: directEntity, error: directError } = await supabase
        .from("entities")
        .select("id")
        .eq("entity_type", "nonprofit")
        .eq("id", nonprofitId)
        .maybeSingle();
    if (directError) throw directError;
    if (directEntity?.id) return String(directEntity.id);

    const { data: byExternal, error: externalError } = await supabase
        .from("entities")
        .select("id, external_ids")
        .eq("entity_type", "nonprofit")
        .eq("external_ids->>nonprofit_id", nonprofitId)
        .maybeSingle();
    if (externalError) throw externalError;
    if (byExternal?.id) return String(byExternal.id);

    return null;
}

async function resolveNonprofitIdFromEntityId(
    entityId: string,
): Promise<string | null> {
    const supabase = await createApiClient();
    const { data, error } = await supabase
        .from("entities")
        .select("external_ids")
        .eq("entity_type", "nonprofit")
        .eq("id", entityId)
        .maybeSingle();

    if (error) throw error;
    const externalIds = data?.external_ids as Record<string, unknown> | null;
    const nonprofitId = externalIds?.nonprofit_id;
    return typeof nonprofitId === "string" ? nonprofitId : null;
}

async function mapNonprofitEntityIds(
    nonprofitIds: string[],
): Promise<Map<string, string>> {
    const supabase = await createApiClient();
    const entityIdByNonprofitId = new Map<string, string>();

    if (nonprofitIds.length === 0) return entityIdByNonprofitId;

    const { data: directRows, error: directError } = await supabase
        .from("entities")
        .select("id")
        .eq("entity_type", "nonprofit")
        .in("id", nonprofitIds);
    if (directError) throw directError;
    (directRows ?? []).forEach((row) => {
        if (row?.id) {
            entityIdByNonprofitId.set(String(row.id), String(row.id));
        }
    });

    const { data: externalRows, error: externalError } = await supabase
        .from("entities")
        .select("id, external_ids")
        .eq("entity_type", "nonprofit")
        .in("external_ids->>nonprofit_id", nonprofitIds);
    if (externalError) throw externalError;

    (externalRows ?? []).forEach((row) => {
        const externalIds = row.external_ids as Record<string, unknown> | null;
        const nonprofitId = externalIds?.nonprofit_id;
        if (row?.id && typeof nonprofitId === "string") {
            entityIdByNonprofitId.set(nonprofitId, String(row.id));
        }
    });

    return entityIdByNonprofitId;
}

/**
 * Fetch a nonprofit by ID.
 */
export async function getNonprofitDTO(id: string): Promise<NonprofitDTO> {
    const supabase = await createApiClient();

    const { data: nonprofit, error: nonprofitError } = await supabase
        .from("nonprofits")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (nonprofitError) {
        throw new Error(nonprofitError.message);
    }

    if (nonprofit) {
        const entityId = await resolveNonprofitEntityIdByNonprofitId(
            String(nonprofit.id),
        );
        return {
            ...nonprofit,
            entity_id: entityId ?? null,
            foundation_metadata: null,
        };
    }

    const nonprofitId = await resolveNonprofitIdFromEntityId(id);
    if (!nonprofitId) {
        throw new Error("Nonprofit not found");
    }

    const { data: nonprofitByEntity, error: nonprofitByEntityError } =
        await supabase
            .from("nonprofits")
            .select("*")
            .eq("id", nonprofitId)
            .maybeSingle();

    if (nonprofitByEntityError || !nonprofitByEntity) {
        throw new Error(nonprofitByEntityError?.message ?? "Nonprofit not found");
    }

    return {
        ...nonprofitByEntity,
        entity_id: id,
        foundation_metadata: null,
    };
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
    const supabase = await createApiClient();

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

    const ids = nonprofits
        .map((np) => String(np.id))
        .filter((value) => value.length > 0);
    const entityIdByNonprofitId = await mapNonprofitEntityIds(ids);

    return nonprofits.map((np) => ({
        ...np,
        entity_id: entityIdByNonprofitId.get(String(np.id)) ?? null,
        foundation_metadata: null,
    }));
}

/**
 * District foundation lookup:
 * Every district SHOULD have exactly one district foundation nonprofit.
 */
export async function getDistrictFoundationDTO(
    districtId: string,
): Promise<NonprofitDTO | null> {
    const supabase = await createApiClient();

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

    return { ...nonprofit, foundation_metadata: null };
}

/**
 * Create a nonprofit
 */
export async function createNonprofitDTO(
    payload: Partial<Nonprofit>,
): Promise<NonprofitDTO> {
    // use authenticated client so RLS enforces admin checks
    const supabase = await createApiClient();
    const sanitized: Record<string, unknown> = {};
    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined) return;
        if (value === "") return;
        if (["id", "created_at", "updated_at"].includes(key)) return;
        sanitized[key] = value;
    });

    const { data, error } = await supabase
        .from("nonprofits")
        .insert(sanitized)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    // Create an empty metadata row if needed

    return getNonprofitDTO(data.id);
}

/**
 * Update a nonprofit by ID
 */
export async function updateNonprofitDTO(
    id: string,
    payload: Partial<Nonprofit>,
): Promise<NonprofitDTO> {
    const supabase = await createApiClient();
    const sanitized: Record<string, unknown> = {};
    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined) return;
        if (value === "") return;
        if (["id", "created_at", "updated_at"].includes(key)) return;
        sanitized[key] = value;
    });

    const { error } = await supabase
        .from("nonprofits")
        .update(sanitized)
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
