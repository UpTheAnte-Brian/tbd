"use client";

import { useEffect, useState } from "react";
import { createCachedResource } from "@/app/lib/fetch/createCachedResource";

export type AssetSlot = {
  id: string;
  entity_type?: string | null;
  category_id: string | null;
  subcategory_id?: string | null;
  name?: string | null;
  label?: string | null;
  help_text?: string | null;
  sort_order?: number | null;
  allowed_mime_types?: string[] | string | null;
  max_assets?: number | null;
};

export type AssetCategory = {
  id: string;
  key?: string | null;
  name?: string | null;
  label?: string | null;
  sort_order?: number | null;
};

export type AssetSubcategory = {
  id: string;
  category_id?: string | null;
  key?: string | null;
  name?: string | null;
  label?: string | null;
  sort_order?: number | null;
};

export type BrandingAsset = {
  id: string;
  entity_id: string;
  category_id: string | null;
  subcategory_id?: string | null;
  name?: string | null;
  path?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  is_retired?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type BrandingAssetsCacheEntry = {
  slots: AssetSlot[];
  categories: AssetCategory[];
  subcategories: AssetSubcategory[];
  assets: BrandingAsset[];
};

const BRANDING_ASSETS_CACHE_TTL_MS = 5 * 60_000;

const brandingAssetsResource = createCachedResource<
  { entityType: string; entityId: string },
  BrandingAssetsCacheEntry
>(
  ({ entityType, entityId }) => `${entityType}:${entityId}`,
  { cacheTTLms: BRANDING_ASSETS_CACHE_TTL_MS }
);

export function useBrandingAssets(
  entityId: string | null,
  entityType: string,
  refreshKey: number = 0
) {
  const [slots, setSlots] = useState<AssetSlot[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [subcategories, setSubcategories] = useState<AssetSubcategory[]>([]);
  const [assets, setAssets] = useState<BrandingAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId || !entityType) return;
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await brandingAssetsResource.get(
          { entityType, entityId },
          async () => {
            const [slotsRes, assetsRes] = await Promise.all([
              fetch(`/api/branding/slots?entityType=${entityType}`, {
                cache: "no-store",
              }),
              fetch(`/api/branding/assets?entityId=${entityId}`, {
                cache: "no-store",
              }),
            ]);

            if (!slotsRes.ok) {
              const body = await slotsRes.json().catch(() => ({}));
              throw new Error(body.error || "Failed to load branding slots");
            }
            if (!assetsRes.ok) {
              const body = await assetsRes.json().catch(() => ({}));
              throw new Error(body.error || "Failed to load branding assets");
            }

            const slotsData = await slotsRes.json();
            const assetsData = await assetsRes.json();

            return {
              slots: (slotsData?.slots ?? []) as AssetSlot[],
              categories: (slotsData?.categories ?? []) as AssetCategory[],
              subcategories: (slotsData?.subcategories ?? []) as AssetSubcategory[],
              assets: (assetsData?.assets ?? []) as BrandingAsset[],
            } satisfies BrandingAssetsCacheEntry;
          },
          { force: refreshKey !== 0 }
        );

        if (cancelled) return;
        setSlots(data.slots);
        setCategories(data.categories);
        setSubcategories(data.subcategories);
        setAssets(data.assets);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error");
          setSlots([]);
          setCategories([]);
          setSubcategories([]);
          setAssets([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [entityId, entityType, refreshKey]);

  return {
    slots,
    categories,
    subcategories,
    assets,
    loading,
    error,
  } as const;
}
