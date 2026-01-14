import { createClient } from "@/utils/supabase/server";
import { resolveEntityId } from "@/app/lib/entities";
import {
  resolveBrandingTokens,
  type ResolvedBranding,
} from "@/app/lib/branding/resolveBranding";
import type {
  BrandingPalette,
  BrandingTypography,
} from "@/app/lib/types/types";

export type ResolvedEntityBranding = ResolvedBranding & {
  entityId: string;
  palettes: BrandingPalette[];
  typographyRows: BrandingTypography[];
};

export async function getResolvedEntityBranding(entityKey: string) {
  const supabase = await createClient();
  const entityId = await resolveEntityId(supabase, entityKey);

  const warnQuery = (label: string, error: unknown) => {
    console.warn(`[branding] ${label} query failed`, error);
  };

  const {
    data: palettes,
    error: palettesError,
  } = await supabase
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
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true })
    .order("slot", { foreignTable: "palette_colors", ascending: true });
  if (palettesError) warnQuery("palettes", palettesError);

  const {
    data: typography,
    error: typographyError,
  } = await supabase
    .schema("branding")
    .from("typography")
    .select("*")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });
  if (typographyError) warnQuery("typography", typographyError);

  const normalizedPalettes: BrandingPalette[] = (palettes ?? []).map(
    (palette) => ({
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
    }),
  );

  const resolved = resolveBrandingTokens(
    normalizedPalettes,
    (typography ?? []) as BrandingTypography[],
  );

  const result: ResolvedEntityBranding = {
    entityId,
    colors: resolved.colors,
    typography: resolved.typography,
    palettes: normalizedPalettes,
    typographyRows: (typography ?? []) as BrandingTypography[],
  };

  return result;
}
