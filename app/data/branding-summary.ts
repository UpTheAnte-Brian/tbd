import { createApiClient } from "@/utils/supabase/route";
import { resolveDistrictEntityId } from "@/app/lib/entities";
import type { BrandingSummary } from "@/app/lib/types/types";

export async function getBrandingSummary(
    entityId: string,
): Promise<BrandingSummary | null> {
    const supabase = await createApiClient();
    let resolvedEntityId = entityId;
    try {
        resolvedEntityId = await resolveDistrictEntityId(
            supabase,
            entityId,
        );
    } catch (err) {
        console.error("Failed to resolve entity id for branding", err);
        return null;
    }

    const logos: BrandingSummary["logos"] = [];

    const { data: patterns, error: patternsErr } = await supabase
        .schema("branding")
        .from("patterns")
        .select("*")
        .eq("entity_id", resolvedEntityId)
        .order("created_at", { ascending: false });
    if (patternsErr) {
        console.error("Failed to fetch patterns", patternsErr);
        return null;
    }

    const { data: palettes, error: palettesErr } = await supabase
        .schema("branding")
        .from("palettes")
        .select("*")
        .eq("entity_id", resolvedEntityId)
        .order("created_at", { ascending: true });
    if (palettesErr) {
        console.error("Failed to fetch palettes", palettesErr);
        return null;
    }

    const { data: typography, error: typographyErr } = await supabase
        .schema("branding")
        .from("typography")
        .select("*")
        .eq("entity_id", resolvedEntityId)
        .order("created_at", { ascending: true });
    if (typographyErr) {
        console.error("Failed to fetch typography", typographyErr);
        return null;
    }

    const fonts = typography;

    return {
        logos,
        patterns,
        fonts,
        palettes,
        typography,
    };
}
