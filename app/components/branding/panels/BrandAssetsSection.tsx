"use client";

import { useMemo, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { getSupabaseClient } from "@/utils/supabase/client";
import AccordionCard from "@/app/components/user/AccordionCard";
import type {
  AssetCategory,
  AssetSlot,
  AssetSubcategory,
  BrandingAsset,
} from "@/app/hooks/useBrandingAssets";
import type { EntityType } from "@/app/lib/types/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

interface Props {
  entityId: string | null;
  entityType: EntityType;
  slots: AssetSlot[];
  categories: AssetCategory[];
  subcategories: AssetSubcategory[];
  assets: BrandingAsset[];
  canEdit: boolean;
  onRefresh: () => void;
}

export default function BrandAssetsSection({
  entityId,
  entityType,
  slots,
  categories,
  subcategories,
  assets,
  canEdit,
  onRefresh,
}: Props) {
  const [uploadingSlotId, setUploadingSlotId] = useState<string | null>(null);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const subcategoryById = useMemo(
    () => new Map(subcategories.map((s) => [s.id, s])),
    [subcategories]
  );

  const getCategoryLabel = (categoryId: string | null) => {
    if (!categoryId) return "";
    const category = categoryById.get(categoryId);
    return category?.label ?? category?.name ?? category?.key ?? categoryId;
  };

  const getSubcategoryLabel = (subcategoryId: string | null | undefined) => {
    if (!subcategoryId) return "";
    const subcategory = subcategoryById.get(subcategoryId);
    return (
      subcategory?.label ??
      subcategory?.name ??
      subcategory?.key ??
      subcategoryId
    );
  };

  const getSlotLabel = (slot: AssetSlot) => {
    return (
      slot.label ||
      slot.name ||
      [getCategoryLabel(slot.category_id), getSubcategoryLabel(slot.subcategory_id)]
        .filter(Boolean)
        .join(" - ") ||
      "Asset Slot"
    );
  };

  const getSlotAssets = (slot: AssetSlot) =>
    assets.filter(
      (asset) =>
        asset.category_id === slot.category_id &&
        (asset.subcategory_id ?? null) === (slot.subcategory_id ?? null)
    );

  const resolveAllowedMimeTypes = (slot: AssetSlot): string[] => {
    if (Array.isArray(slot.allowed_mime_types)) return slot.allowed_mime_types;
    if (typeof slot.allowed_mime_types === "string") {
      return slot.allowed_mime_types
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [];
  };

  const getAssetUrl = (asset: BrandingAsset) => {
    if (!asset.path || !SUPABASE_URL) return null;
    const version = asset.updated_at ?? asset.created_at ?? "";
    return `${SUPABASE_URL}/storage/v1/object/public/branding-assets/${asset.path}?v=${version}`;
  };

  const handleUpload = async (
    slot: AssetSlot,
    file: File,
    slotAssets: BrandingAsset[]
  ) => {
    if (!entityId) return;
    if (!slot.category_id) {
      alert("Slot is missing a category.");
      return;
    }
    const allowed = resolveAllowedMimeTypes(slot);
    if (allowed.length > 0 && !allowed.includes(file.type)) {
      alert(`File type ${file.type} is not allowed for this slot.`);
      return;
    }

    try {
      setUploadingSlotId(slot.id);
      if (slot.max_assets === 1 && slotAssets.length > 0) {
        await Promise.all(
          slotAssets.map((asset) =>
            fetch(`/api/branding/assets/${asset.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isRetired: true }),
            })
          )
        );
      }

      const createRes = await fetch(`/api/branding/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          categoryId: slot.category_id,
          subcategoryId: slot.subcategory_id ?? null,
          name: file.name,
        }),
      });

      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create asset");
      }

      const created = (await createRes.json()) as {
        asset?: { id?: string; path?: string | null };
      };
      const assetId = created.asset?.id;
      const assetPath = created.asset?.path ?? null;
      if (!assetId || !assetPath) {
        throw new Error("Failed to create asset");
      }

      const supabase = getSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from("branding-assets")
        .upload(assetPath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        await fetch(`/api/branding/assets/${assetId}`, { method: "DELETE" });
        throw uploadError;
      }

      const patchRes = await fetch(`/api/branding/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });

      if (!patchRes.ok) {
        const body = await patchRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to finalize asset");
      }

      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingSlotId(null);
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm("Delete this asset?")) return;
    const res = await fetch(`/api/branding/assets/${assetId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Failed to delete asset");
      return;
    }
    onRefresh();
  };

  return (
    <AccordionCard
      variant="brand"
      title={
        <span className="flex items-center gap-2 text-brand-primary-0">
          <ImageIcon size={18} className="text-blue-300" />
          Brand Assets
        </span>
      }
      defaultOpen={false}
    >
      {!entityId ? (
        <div className="text-sm text-red-200">
          Missing entity mapping for this {entityType}.
        </div>
      ) : slots.length === 0 ? (
        <div className="text-sm text-slate-200">
          No asset slots configured for this entity.
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => {
            const slotAssets = getSlotAssets(slot);
            const allowed = resolveAllowedMimeTypes(slot);
            const maxAssets = slot.max_assets ?? null;
            const canAdd = maxAssets === null || slotAssets.length < maxAssets;
            const canReplace = maxAssets === 1 && slotAssets.length > 0;
            const inputId = `asset-slot-${slot.id}`;
            return (
              <details
                key={slot.id}
                className="rounded-lg border border-white/10 bg-brand-primary-0/30"
              >
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-white">
                  <span>{getSlotLabel(slot)}</span>
                  <span className="text-xs text-slate-300">
                    {slotAssets.length}/{maxAssets ?? "inf"}
                  </span>
                </summary>
                <div className="px-4 pb-4 pt-2 space-y-3 text-sm text-slate-100">
                  {slot.help_text && (
                    <div className="text-slate-200">{slot.help_text}</div>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                    {allowed.length > 0 && (
                      <span>Allowed: {allowed.join(", ")}</span>
                    )}
                    {maxAssets !== null && <span>Max: {maxAssets}</span>}
                  </div>

                  {slotAssets.length === 0 ? (
                    <div className="rounded border border-dashed border-white/20 bg-white/5 p-3 text-slate-300">
                      No assets uploaded yet.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {slotAssets.map((asset) => {
                        const assetUrl = getAssetUrl(asset);
                        return (
                          <div
                            key={asset.id}
                            className="rounded border border-white/10 bg-white/10 p-3 space-y-2"
                          >
                            <div className="text-xs text-slate-300">
                              {asset.name || "Untitled asset"}
                            </div>
                            {assetUrl ? (
                              <img
                                src={assetUrl}
                                alt={asset.name ?? "Brand asset"}
                                className="max-h-36 w-full rounded bg-white object-contain p-2"
                              />
                            ) : (
                              <div className="flex h-28 items-center justify-center rounded bg-white/20 text-xs text-slate-300">
                                No preview available
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs text-slate-300">
                              <span>{asset.mime_type ?? "unknown"}</span>
                              {canEdit && (
                                <button
                                  onClick={() => handleDelete(asset.id)}
                                  className="rounded bg-red-600/80 px-2 py-1 text-white hover:bg-red-700"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {canEdit && (canAdd || canReplace) && (
                    <button
                      type="button"
                      onClick={() => document.getElementById(inputId)?.click()}
                      className="inline-flex items-center rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      disabled={uploadingSlotId === slot.id}
                    >
                      {uploadingSlotId === slot.id
                        ? "Uploading..."
                        : slotAssets.length > 0 && slot.max_assets === 1
                        ? "Replace asset"
                        : "Upload asset"}
                    </button>
                  )}

                  {!canEdit && (
                    <div className="text-xs text-slate-300">
                      You do not have permission to edit assets.
                    </div>
                  )}

                  <input
                    id={inputId}
                    type="file"
                    className="hidden"
                    accept={allowed.length > 0 ? allowed.join(",") : undefined}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      handleUpload(slot, file, slotAssets);
                      e.currentTarget.value = "";
                    }}
                  />
                </div>
              </details>
            );
          })}
        </div>
      )}
    </AccordionCard>
  );
}
