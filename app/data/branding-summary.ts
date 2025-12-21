import { createApiClient } from "@/utils/supabase/route";
import type { BrandingSummary, EntityType } from "@/app/lib/types/types";

export async function getBrandingSummary(
    entityId: string,
    entityType: EntityType = "district",
): Promise<BrandingSummary | null> {
    const supabase = await createApiClient();

    const { data: logos, error: logosErr } = await supabase
        .schema("branding")
        .from("logos")
        .select("*")
        .eq("entity_id", entityId)
        .eq("entity_type", entityType)
        .order("created_at", { ascending: false });
    if (logosErr) {
        console.error("Failed to fetch logos", logosErr);
        return null;
    }

    const { data: patterns, error: patternsErr } = await supabase
        .schema("branding")
        .from("patterns")
        .select("*")
        .eq("entity_id", entityId)
        .eq("entity_type", entityType)
        .order("created_at", { ascending: false });
    if (patternsErr) {
        console.error("Failed to fetch patterns", patternsErr);
        return null;
    }

    const { data: palettes, error: palettesErr } = await supabase
        .schema("branding")
        .from("palettes")
        .select("*")
        .eq("entity_id", entityId)
        .eq("entity_type", entityType)
        .order("created_at", { ascending: true });
    if (palettesErr) {
        console.error("Failed to fetch palettes", palettesErr);
        return null;
    }

    const { data: typography, error: typographyErr } = await supabase
        .schema("branding")
        .from("typography")
        .select("*")
        .eq("entity_id", entityId)
        .eq("entity_type", entityType)
        .order("created_at", { ascending: true });
    if (typographyErr) {
        console.error("Failed to fetch typography", typographyErr);
        return null;
    }

    const fonts = typography;

    const { data: schools, error: schoolsErr } = await supabase
        .schema("branding")
        .from("schools")
        .select("*")
        .eq("entity_id", entityId)
        .eq("entity_type", entityType)
        .order("created_at", { ascending: true });
    if (schoolsErr) {
        console.error("Failed to fetch schools", schoolsErr);
        return null;
    }

    return {
        logos,
        patterns,
        fonts,
        palettes,
        typography,
        schools,
    };
}
