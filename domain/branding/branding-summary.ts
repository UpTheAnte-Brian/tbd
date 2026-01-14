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
        .select(
            `
                id,
                name,
                role,
                usage_notes,
                created_at,
                updated_at,
                entity_id,
                palette_colors (
                    id,
                    slot,
                    hex,
                    label,
                    usage_notes,
                    created_at,
                    updated_at
                )
            `
        )
        .eq("entity_id", resolvedEntityId)
        .order("created_at", { ascending: true })
        .order("slot", { foreignTable: "palette_colors", ascending: true });
    if (palettesErr) {
        console.error("Failed to fetch palettes", palettesErr);
        return null;
    }
    const normalizedPalettes: BrandingSummary["palettes"] = (palettes ?? [])
        .map((palette) => ({
            id: String(palette.id),
            entity_id: String(palette.entity_id),
            name: palette.name ?? palette.role ?? "",
            role: palette.role,
            usage_notes: palette.usage_notes ?? null,
            created_at: palette.created_at ?? null,
            updated_at: palette.updated_at ?? null,
            colors: Array.isArray(palette.palette_colors)
                ? palette.palette_colors
                    .map((color) => ({
                        id: color.id ?? undefined,
                        slot: Number(color.slot ?? 0),
                        hex: String(color.hex ?? ""),
                        label: color.label ?? null,
                        usage_notes: color.usage_notes ?? null,
                    }))
                    .sort((a, b) => a.slot - b.slot)
                : [],
        }));

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
        palettes: normalizedPalettes,
        typography,
    };
}
