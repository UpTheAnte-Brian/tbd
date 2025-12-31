import { createClient } from "@/utils/supabase/server";
import { resolveEntityId } from "@/app/lib/entities";
import {
  buildBrandCssVars,
  resolveBrandingTokens,
  type ResolvedBranding,
} from "@/app/lib/branding/resolveBranding";
import type {
  BrandingPalette,
  BrandingTypography,
} from "@/app/lib/types/types";

export type BrandingAssetRow = {
  id: string;
  entity_id: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  name?: string | null;
  path?: string | null;
  mime_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_retired?: boolean | null;
};

type AssetCategoryRow = {
  id: string;
  key?: string | null;
  label?: string | null;
};

export type ResolvedEntityBranding = ResolvedBranding & {
  entityId: string;
  palettes: BrandingPalette[];
  typographyRows: BrandingTypography[];
  assets: BrandingAssetRow[];
  primaryLogoAsset: BrandingAssetRow | null;
  cssVars: Record<string, string>;
};

const normalizeLabel = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase();

const resolvePrimaryLogoAsset = (
  assets: BrandingAssetRow[],
  categories: AssetCategoryRow[],
) => {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const active = assets.filter((asset) => !asset.is_retired);

  const scoreAsset = (asset: BrandingAssetRow) => {
    const category = categoryById.get(asset.category_id ?? "");
    const label = `${normalizeLabel(category?.label)} ${normalizeLabel(
      category?.key,
    )}`;
    const isLogo = label.includes("logo") || label.includes("mark");
    const isPrimary = label.includes("primary");
    if (isLogo && isPrimary) return 2;
    if (isLogo) return 1;
    return 0;
  };

  const sorted = [...active].sort((a, b) => {
    const scoreDiff = scoreAsset(b) - scoreAsset(a);
    if (scoreDiff !== 0) return scoreDiff;
    const aTime = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
    const bTime = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
    return bTime - aTime;
  });

  const best = sorted.find((asset) => scoreAsset(asset) > 0) ?? null;
  return best;
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

  const {
    data: assets,
    error: assetsError,
  } = await supabase
    .schema("branding")
    .from("assets")
    .select("*")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (assetsError) warnQuery("assets", assetsError);

  const {
    data: categories,
    error: categoriesError,
  } = await supabase
    .schema("branding")
    .from("asset_categories")
    .select("id, key, label");
  if (categoriesError) warnQuery("asset_categories", categoriesError);

  const resolved = resolveBrandingTokens(
    (palettes ?? []) as BrandingPalette[],
    (typography ?? []) as BrandingTypography[],
  );

  const cssVars = buildBrandCssVars(resolved, { includeDistrict: true });
  const primaryLogoAsset = resolvePrimaryLogoAsset(
    (assets ?? []) as BrandingAssetRow[],
    (categories ?? []) as AssetCategoryRow[],
  );

  const result: ResolvedEntityBranding = {
    entityId,
    colors: resolved.colors,
    typography: resolved.typography,
    palettes: (palettes ?? []) as BrandingPalette[],
    typographyRows: (typography ?? []) as BrandingTypography[],
    assets: (assets ?? []) as BrandingAssetRow[],
    primaryLogoAsset,
    cssVars,
  };

  return result;
}
