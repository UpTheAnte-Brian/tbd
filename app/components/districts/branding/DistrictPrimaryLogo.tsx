"use client";

import { useMemo } from "react";
import { useBrandingAssets } from "@/app/hooks/useBrandingAssets";
import { EntityType } from "@/app/lib/types/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

type Props = {
  entityId: string | null;
  entityType?: EntityType;
  districtName?: string;
};

export default function DistrictPrimaryLogo({
  entityId,
  entityType = "district",
  districtName,
}: Props) {
  const { slots, categories, assets, loading, error } = useBrandingAssets(
    entityId,
    entityType,
    0
  );

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const logoUrl = useMemo(() => {
    if (!assets.length || !SUPABASE_URL) return null;
    const getCategoryLabel = (categoryId: string | null) => {
      if (!categoryId) return "";
      const category = categoryById.get(categoryId);
      return category?.label ?? category?.name ?? categoryId;
    };

    const matchesSlot = (slotId: string) => {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) return [];
      return assets.filter(
        (asset) =>
          asset.category_id === slot.category_id &&
          (asset.subcategory_id ?? null) === (slot.subcategory_id ?? null)
      );
    };

    const primarySlot = slots.find((slot) => {
      const label = (
        slot.label ||
        slot.name ||
        getCategoryLabel(slot.category_id) ||
        ""
      ).toLowerCase();
      return label.includes("primary");
    });

    const candidateAssets = primarySlot
      ? matchesSlot(primarySlot.id)
      : assets;

    const chosen = candidateAssets[0] ?? assets[0];
    if (!chosen?.path) return null;

    const version = chosen.updated_at ?? chosen.created_at ?? "";
    return `${SUPABASE_URL}/storage/v1/object/public/branding-assets/${chosen.path}?v=${version}`;
  }, [assets, categoryById, slots]);

  if (!entityId) {
    return (
      <div className="rounded-lg border border-gray-300 bg-white p-4 text-sm text-gray-600">
        Select a district to view its primary logo.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-district-primary-1/40 bg-district-primary-0 p-4 text-district-secondary-0">
        Loading logo…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 text-sm">
        Failed to load district logo: {error}
      </div>
    );
  }

  return logoUrl ? (
    <div className="w-full h-20 max-h-24 min-h-16 bg-white flex items-center justify-center rounded p-2">
      <img
        src={logoUrl}
        alt={`${districtName ?? "District"} primary logo`}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  ) : (
    <div className="rounded border border-district-primary-1/30 bg-white/60 px-4 py-3 text-sm text-district-secondary-0">
      No logo uploaded yet.
    </div>
  );
}
