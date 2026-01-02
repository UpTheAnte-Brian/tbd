"use client";

import { useMemo } from "react";
import { EntityType } from "@/app/lib/types/types";
import { useBrandingAssets } from "@/app/hooks/useBrandingAssets";

type Props = {
  entityId: string;
  entityType: EntityType;
  preferredSlotKeys?: string[];
  className?: string;
  size?: number;
};

export function EntityLogo({
  entityId,
  entityType,
  preferredSlotKeys = [
    "primary",
    "logo",
    "icon",
    "mark",
  ],
  className,
  size = 48,
}: Props) {
  const { slots, categories, subcategories, assets } = useBrandingAssets(
    entityId,
    entityType,
    0
  );

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const subcategoryById = useMemo(
    () => new Map(subcategories.map((s) => [s.id, s])),
    [subcategories]
  );

  const logoUrl = useMemo(() => {
    if (!assets.length || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

    const getLabel = (slotId: string) => {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) return "";
      const category = slot.category_id
        ? categoryById.get(slot.category_id)
        : null;
      const subcategory = slot.subcategory_id
        ? subcategoryById.get(slot.subcategory_id)
        : null;
      return (
        slot.label ||
        slot.name ||
        subcategory?.label ||
        subcategory?.name ||
        category?.label ||
        category?.name ||
        ""
      );
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

    let candidateAssets: typeof assets = [];
    for (const key of preferredSlotKeys) {
      const match = slots.find((slot) =>
        getLabel(slot.id).toLowerCase().includes(key.toLowerCase())
      );
      if (!match) continue;
      const found = matchesSlot(match.id);
      if (found.length > 0) {
        candidateAssets = found;
        break;
      }
    }

    if (candidateAssets.length === 0) {
      candidateAssets = assets;
    }

    const chosen = candidateAssets[0];
    if (!chosen?.path) return null;
    const version = chosen.updated_at ?? chosen.created_at ?? "";
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branding-assets/${chosen.path}?v=${version}`;
  }, [assets, categoryById, preferredSlotKeys, slots, subcategoryById]);

  if (logoUrl) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-md bg-white ${className ?? ""}`}
        style={{ width: size, height: size }}
      >
        <img
          src={logoUrl}
          alt={`${entityType} logo`}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-md bg-gray-200 text-gray-700 text-xs font-semibold ${className ?? ""}`}
      style={{ width: size, height: size }}
      title={`${entityType} • ${entityId}`}
    >
      {entityType}
    </div>
  );
}
