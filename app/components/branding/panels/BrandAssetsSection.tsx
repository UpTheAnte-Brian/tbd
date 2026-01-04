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
      [
        getCategoryLabel(slot.category_id),
        getSubcategoryLabel(slot.subcategory_id),
      ]
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
          slotId: slot.id,
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

      const signedRes = await fetch(
        `/api/branding/assets/${assetId}/upload-url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: file.type,
            sizeBytes: file.size,
          }),
        }
      );

      const signedBody = (await signedRes.json().catch(() => ({}))) as {
        signedUrl?: string;
        token?: string;
        path?: string;
        error?: string;
      };

      if (!signedRes.ok) {
        throw new Error(
          signedBody.error || "Failed to create signed upload URL"
        );
      }

      const signedUrl = signedBody.signedUrl ?? null;
      const signedToken = signedBody.token ?? null;
      const signedPath = signedBody.path ?? null;
      if (!signedUrl || !signedToken || !signedPath) {
        throw new Error("Signed upload response is missing required fields");
      }

      const uploadOptions = {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
      };

      console.info("[branding-upload] start", {
        entityId,
        categoryId: slot.category_id,
        subcategoryId: slot.subcategory_id ?? null,
        assetId,
        assetPath,
        bucket: "branding-assets",
        method: "uploadToSignedUrl",
        uploadUrl: signedUrl,
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
        },
        options: uploadOptions,
      });

      const supabase = getSupabaseClient();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("branding-assets")
        .uploadToSignedUrl(signedPath, signedToken, file, uploadOptions);

      if (uploadError) {
        console.error("[branding-upload] failed", {
          assetId,
          assetPath,
          error: uploadError,
          status: (uploadError as { status?: number })?.status,
          message: (uploadError as { message?: string })?.message,
          uploadData,
        });
        console.info("[branding-upload] cleanup", {
          reason: "upload_failed",
          assetId,
          assetPath,
        });
        const cleanupRes = await fetch(`/api/branding/assets/${assetId}`, {
          method: "DELETE",
        });
        if (!cleanupRes.ok) {
          const cleanupBody = await cleanupRes.json().catch(() => ({}));
          console.error("[branding-upload] cleanup_failed", {
            assetId,
            assetPath,
            status: cleanupRes.status,
            body: cleanupBody,
          });
        } else {
          console.info("[branding-upload] cleanup_complete", {
            assetId,
            assetPath,
          });
        }
        throw uploadError;
      }

      console.info("[branding-upload] success", {
        assetId,
        assetPath,
        uploadData,
      });

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
      title={
        <span className="flex items-center gap-2">
          <ImageIcon size={18} />
          Brand Assets
        </span>
      }
      defaultOpen={false}
    >
      {!entityId ? (
        <div className="text-sm text-brand-primary-2">
          Missing entity mapping for this {entityType}.
        </div>
      ) : slots.length === 0 ? (
        <div className="text-sm text-brand-secondary-0">
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
                className="rounded-lg border border-brand-secondary-1 bg-brand-secondary-2"
              >
                <summary className="flex cursor-pointer items-center justify-between border-b border-brand-secondary-1 px-4 py-3 text-sm font-semibold text-brand-secondary-0 bg-brand-secondary-2">
                  <span>{getSlotLabel(slot)}</span>
                  <span className="text-xs text-brand-secondary-0 opacity-70">
                    {slotAssets.length}/{maxAssets ?? "inf"}
                  </span>
                </summary>
                <div className="px-4 pb-4 pt-2 space-y-3 text-sm text-brand-secondary-0">
                  {slot.help_text && (
                    <div className="opacity-80">{slot.help_text}</div>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-brand-secondary-0 opacity-70">
                    {allowed.length > 0 && (
                      <span>Allowed: {allowed.join(", ")}</span>
                    )}
                    {maxAssets !== null && <span>Max: {maxAssets}</span>}
                  </div>

                  {slotAssets.length === 0 ? (
                    <div className="rounded border border-dashed border-brand-secondary-1 bg-brand-secondary-2 p-3 text-brand-secondary-0 opacity-70">
                      No assets uploaded yet.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {slotAssets.map((asset) => {
                        const assetUrl = getAssetUrl(asset);
                        return (
                          <div
                            key={asset.id}
                            className="rounded border border-brand-secondary-1 bg-brand-secondary-2 p-3 space-y-2"
                          >
                            <div className="text-xs text-brand-secondary-0 opacity-70">
                              {asset.name || "Untitled asset"}
                            </div>
                            {assetUrl ? (
                              <img
                                src={assetUrl}
                                alt={asset.name ?? "Brand asset"}
                                className="max-h-36 w-full rounded border border-brand-secondary-1 bg-brand-secondary-2 object-contain p-2"
                              />
                            ) : (
                              <div className="flex h-28 items-center justify-center rounded bg-brand-secondary-1 text-xs text-brand-secondary-0 opacity-70">
                                No preview available
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs text-brand-secondary-0 opacity-70">
                              <span>{asset.mime_type ?? "unknown"}</span>
                              {canEdit && (
                                <button
                                  onClick={() => handleDelete(asset.id)}
                                  className="rounded bg-brand-primary-2 px-2 py-1 text-brand-secondary-2 hover:bg-brand-primary-0"
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
                      className="inline-flex items-center rounded bg-brand-primary-0 px-3 py-2 text-xs font-semibold text-brand-secondary-2 hover:bg-brand-primary-2"
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
                    <div className="text-xs text-brand-secondary-0 opacity-70">
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
