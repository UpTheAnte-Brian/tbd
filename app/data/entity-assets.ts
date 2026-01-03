import { createClient } from "@/utils/supabase/server";
import { resolveEntityId } from "@/app/lib/entities";

export type ResolvedEntityAssets = {
  entityId: string;
  primaryLogoUrl: string | null;
};

type BrandingAssetRow = {
  id: string;
  category_id?: string | null;
  path?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_retired?: boolean | null;
};

type AssetCategoryRow = {
  id: string;
  key?: string | null;
  label?: string | null;
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

  return sorted.find((asset) => scoreAsset(asset) > 0) ?? null;
};

export async function getResolvedEntityAssets(
  entityKey: string,
): Promise<ResolvedEntityAssets> {
  const supabase = await createClient();
  const entityId = await resolveEntityId(supabase, entityKey);

  const { data: assets, error: assetsError } = await supabase
    .schema("branding")
    .from("assets")
    .select("id, category_id, path, created_at, updated_at, is_retired")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (assetsError) {
    throw new Error(`Failed to fetch assets: ${assetsError.message}`);
  }

  const { data: categories, error: categoriesError } = await supabase
    .schema("branding")
    .from("asset_categories")
    .select("id, key, label");
  if (categoriesError) {
    throw new Error(`Failed to fetch asset categories: ${categoriesError.message}`);
  }

  const primaryLogoAsset = resolvePrimaryLogoAsset(
    (assets ?? []) as BrandingAssetRow[],
    (categories ?? []) as AssetCategoryRow[],
  );

  if (!primaryLogoAsset) {
    return { entityId, primaryLogoUrl: null };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const path = primaryLogoAsset.path ?? null;
  if (!baseUrl || !path) {
    return { entityId, primaryLogoUrl: null };
  }

  const version = primaryLogoAsset.updated_at ?? primaryLogoAsset.created_at ?? "";
  const primaryLogoUrl = `${baseUrl}/storage/v1/object/public/branding-assets/${path}${
    version ? `?v=${version}` : ""
  }`;

  return { entityId, primaryLogoUrl };
}
