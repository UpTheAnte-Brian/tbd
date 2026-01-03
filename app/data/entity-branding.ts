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
    .select("*")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });
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

  const resolved = resolveBrandingTokens(
    (palettes ?? []) as BrandingPalette[],
    (typography ?? []) as BrandingTypography[],
  );

  const result: ResolvedEntityBranding = {
    entityId,
    colors: resolved.colors,
    typography: resolved.typography,
    palettes: (palettes ?? []) as BrandingPalette[],
    typographyRows: (typography ?? []) as BrandingTypography[],
  };

  return result;
}
