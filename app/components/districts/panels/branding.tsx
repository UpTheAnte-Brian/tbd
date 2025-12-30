"use client";

import { useMemo, useState } from "react";
import { getSupabaseClient } from "@/utils/supabase/client";
import { useBrandingAssets } from "@/app/hooks/useBrandingAssets";
import { useBrandingSummary } from "@/app/hooks/useBrandingSummary";
import { useUser } from "@/app/hooks/useUser";
import { hasEntityRole } from "@/app/lib/auth/entityRoles";
import {
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Type as TypeIcon,
  Palette as PaletteIcon,
  // Layers as LayersIcon,
} from "lucide-react";
import ColorPaletteEditor from "@/app/components/branding/ColorPaletteEditor";
import AccordionCard from "@/app/components/user/AccordionCard";
import TypographyEditor from "@/app/components/branding/TypographyEditor";
import type { BrandingTypography, FontRole } from "@/app/lib/types/types";
import { TypographyShowcase } from "@/app/components/branding/TypographyShowcase";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const FONT_ROLES: FontRole[] = [
  "header1",
  "header2",
  "subheader",
  "body",
  "logo",
  "display",
];
const FONT_ROLE_LABELS: Record<string, string> = {
  header1: "Header One",
  header2: "Header Two",
  subheader: "Subheader",
  body: "Body / Paragraph",
  logo: "Logo (reference)",
  display: "Display / Accent",
};
const DEFAULT_TYPOGRAPHY: Record<
  FontRole,
  Pick<
    BrandingTypography,
    "font_name" | "availability" | "weights" | "usage_rules"
  >
> = {
  body: {
    font_name: "Inter",
    availability: "system",
    weights: [],
    usage_rules: "",
  },
  display: {
    font_name: "Inter",
    availability: "system",
    weights: [],
    usage_rules: "",
  },
  logo: {
    font_name: "Inter",
    availability: "system",
    weights: [],
    usage_rules: "",
  },
  header1: {
    font_name: "Inter",
    availability: "system",
    weights: [],
    usage_rules: "",
  },
  header2: {
    font_name: "Inter",
    availability: "system",
    weights: [],
    usage_rules: "",
  },
  subheader: {
    font_name: "Inter",
    availability: "system",
    weights: [],
    usage_rules: "",
  },
};

interface Props {
  districtId: string | null;
  entityId: string | null;
  entityType?: "district" | "nonprofit" | "business";
  entityShortname: string;
}

export function BrandingPanel({
  districtId,
  entityId,
  entityType = "district",
  entityShortname,
}: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingPalette, setEditingPalette] = useState<{
    id?: string;
    name: string;
    colors: string[];
    role?: string;
  } | null>(null);
  const [uploadingSlotId, setUploadingSlotId] = useState<string | null>(null);
  const { user } = useUser();
  const {
    slots,
    categories,
    subcategories,
    assets,
    loading: assetsLoading,
    error: assetsError,
  } = useBrandingAssets(entityId, entityType, refreshKey);
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
  } = useBrandingSummary(districtId, refreshKey);
  const [showTypographyEditor, setShowTypographyEditor] = useState(false);
  const [selectedTypographyRole, setSelectedTypographyRole] =
    useState<string>("body");
  const typographyWithDefaults = useMemo(() => {
    if (!districtId) return [];
    return FONT_ROLES.map((role) => {
      const row =
        summary?.typography.find((t) => t.role === role) ||
        (role === "body"
          ? summary?.typography.find((t) => t.role === "body")
          : null);
      if (row) return row;
      const defaults = DEFAULT_TYPOGRAPHY[role];
      return {
        id: `default-${role}`,
        district_id: districtId,
        entity_id: entityId ?? districtId,
        role,
        font_name: defaults.font_name,
        availability: defaults.availability,
        weights: defaults.weights,
        usage_rules: defaults.usage_rules,
        download_url: null,
        heading_font: null,
        body_font: null,
        accent_font: null,
        created_at: "",
        updated_at: "",
      } as BrandingTypography;
    });
  }, [districtId, entityId, summary?.typography]);

  const maxPaletteColors = useMemo(() => {
    if (!summary?.palettes?.length) return 0;
    return Math.max(0, ...summary.palettes.map((p) => p.colors?.length ?? 0));
  }, [summary]);
  const colorColumns = Math.max(1, maxPaletteColors);
  const paletteGridTemplate = `minmax(220px, 2fr) 90px repeat(${colorColumns}, minmax(52px, 1fr))`;
  const loading = summaryLoading || assetsLoading;
  const error = summaryError || assetsError;
  const canEdit =
    user?.global_role === "admin" ||
    (entityId
      ? hasEntityRole(user?.entity_users ?? [], entityType, entityId, ["admin"])
      : false);

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
    return category?.label ?? category?.name ?? categoryId;
  };

  const getSubcategoryLabel = (subcategoryId: string | null | undefined) => {
    if (!subcategoryId) return "";
    const subcategory = subcategoryById.get(subcategoryId);
    return subcategory?.label ?? subcategory?.name ?? subcategoryId;
  };

  const getSlotLabel = (slot: (typeof slots)[number]) => {
    return (
      slot.label ||
      slot.name ||
      [
        getCategoryLabel(slot.category_id),
        getSubcategoryLabel(slot.subcategory_id),
      ]
        .filter(Boolean)
        .join(" • ") ||
      "Asset Slot"
    );
  };

  const getSlotAssets = (slot: (typeof slots)[number]) =>
    assets.filter(
      (asset) =>
        asset.category_id === slot.category_id &&
        (asset.subcategory_id ?? null) === (slot.subcategory_id ?? null)
    );

  const resolveAllowedMimeTypes = (slot: (typeof slots)[number]): string[] => {
    if (Array.isArray(slot.allowed_mime_types)) return slot.allowed_mime_types;
    if (typeof slot.allowed_mime_types === "string") {
      return slot.allowed_mime_types
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [];
  };

  const getAssetUrl = (asset: (typeof assets)[number]) => {
    if (!asset.path || !SUPABASE_URL) return null;
    const version = asset.updated_at ?? asset.created_at ?? "";
    return `${SUPABASE_URL}/storage/v1/object/public/branding-assets/${asset.path}?v=${version}`;
  };

  const handleUpload = async (
    slot: (typeof slots)[number],
    file: File,
    slotAssets: (typeof assets)[number][]
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

      const path = assetPath;
      const supabase = getSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from("branding-assets")
        .upload(path, file, {
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

      setRefreshKey((k) => k + 1);
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
    setRefreshKey((k) => k + 1);
  };

  if (!districtId) {
    return <div className="text-gray-500 italic">Select a district…</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Loader2 className="animate-spin" size={20} />
        Loading branding…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle size={20} />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-district-secondary-1 text-district-secondary-0 p-6 rounded">
      {editingPalette && districtId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end items-center">
          <div className="w-full max-w-md max-h-[calc(100vh-2rem)] bg-white shadow-xl p-4 overflow-y-auto rounded-lg mr-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingPalette.id ? "Edit Palette" : "Create Palette"}
              </h3>
              <button
                className="text-gray-500 hover:text-gray-800"
                onClick={() => setEditingPalette(null)}
              >
                ✕
              </button>
            </div>

            <ColorPaletteEditor
              initial={editingPalette}
              districtShortname={entityShortname}
              onCancel={() => setEditingPalette(null)}
              onSave={async (palette) => {
                const method = palette.id ? "PATCH" : "POST";
                const url = palette.id
                  ? `/api/districts/${districtId}/branding/palettes/${palette.id}`
                  : `/api/districts/${districtId}/branding/palettes`;

                const res = await fetch(url, {
                  method,
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: palette.name,
                    role: palette.role,
                    colors: palette.colors,
                  }),
                });

                if (!res.ok) {
                  const err = await res.json().catch(() => null);
                  alert(err?.error || "Failed to save palette");
                  return;
                }

                setEditingPalette(null);
                setRefreshKey((k) => k + 1);
              }}
            />
          </div>
        </div>
      )}

      {showTypographyEditor && districtId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end items-center">
          <div className="w-full max-w-md max-h-[calc(100vh-2rem)] bg-white shadow-xl p-4 overflow-y-auto rounded-lg mr-2">
            <TypographyEditor
              districtId={districtId}
              typography={typographyWithDefaults}
              role={selectedTypographyRole}
              onSaved={() => {
                setRefreshKey((k) => k + 1);
                setShowTypographyEditor(false);
              }}
              onClose={() => setShowTypographyEditor(false)}
            />
          </div>
        </div>
      )}

      {/* BRAND ASSETS */}
      <AccordionCard
        variant="district"
        title={
          <span className="flex items-center gap-2 text-district-primary-0">
            <ImageIcon size={18} className="text-blue-300" />
            Brand Assets
          </span>
        }
        defaultOpen={false}
      >
        {!entityId ? (
          <div className="text-sm text-red-200">
            Missing entity mapping for this district.
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
              const canAdd =
                maxAssets === null || slotAssets.length < maxAssets;
              const canReplace = maxAssets === 1 && slotAssets.length > 0;
              const inputId = `asset-slot-${slot.id}`;
              return (
                <details
                  key={slot.id}
                  className="rounded-lg border border-white/10 bg-district-primary-0/30"
                >
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-white">
                    <span>{getSlotLabel(slot)}</span>
                    <span className="text-xs text-slate-300">
                      {slotAssets.length}/{maxAssets ?? "∞"}
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
                        onClick={() =>
                          document.getElementById(inputId)?.click()
                        }
                        className="inline-flex items-center rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                        disabled={uploadingSlotId === slot.id}
                      >
                        {uploadingSlotId === slot.id
                          ? "Uploading…"
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
                      accept={
                        allowed.length > 0 ? allowed.join(",") : undefined
                      }
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

      {/* PATTERNS */}

      {/* PALETTES */}
      <AccordionCard
        variant="district"
        title={
          <span className="flex items-center gap-2 text-district-primary-1">
            <PaletteIcon size={18} className="text-district-primary-0" />
            Color Palettes
          </span>
        }
      >
        {summary?.palettes?.length ? (
          <div className="mt-2 overflow-x-auto">
            <div className="grid gap-2 min-w-max text-sm">
              <div
                className="grid items-center gap-3 px-2 py-1 text-xs uppercase tracking-wide text-slate-300 border-b border-white/10"
                style={{ gridTemplateColumns: paletteGridTemplate }}
              >
                <div>Name</div>
                <div className="text-center">Edit</div>
                {Array.from({ length: colorColumns }).map((_, idx) => (
                  <div
                    key={`header-${idx}`}
                    className="text-center text-xs uppercase tracking-wide"
                  >
                    {idx}
                  </div>
                ))}
              </div>

              {summary?.palettes?.map((palette) => (
                <div
                  key={palette.id}
                  className="grid items-center gap-3 px-2 py-2 border-b border-white/5"
                  style={{ gridTemplateColumns: paletteGridTemplate }}
                >
                  <div className="flex items-center">
                    <h3 className="text-md font-medium text-white">
                      {palette.name}
                    </h3>
                  </div>
                  <div className="flex justify-center">
                    <button
                      className="px-3 py-1 rounded bg-slate-700 text-white text-xs hover:bg-slate-800"
                      onClick={() =>
                        setEditingPalette({
                          id: palette.id,
                          name: palette.name,
                          colors: palette.colors,
                          role: palette.role,
                        })
                      }
                    >
                      Edit
                    </button>
                  </div>
                  {Array.from({ length: colorColumns }).map((_, idx) => {
                    const color = palette.colors[idx];
                    return (
                      <div
                        key={`${palette.id}-color-${idx}`}
                        className="flex items-center justify-center"
                      >
                        {color ? (
                          <div
                            className="w-12 h-12 rounded border shadow-sm"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded border border-dashed border-white/20 flex items-center justify-center text-xs text-white/60">
                            —
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-slate-700">No color palettes defined.</div>
        )}

        <button
          className="mt-4 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() =>
            setEditingPalette({
              id: undefined,
              name: "",
              colors: [],
              role: undefined,
            })
          }
        >
          + Add Palette
        </button>
      </AccordionCard>

      {/* TYPOGRAPHY */}
      <AccordionCard
        variant="district"
        title={
          <span className="flex items-center gap-2 text-slate-50">
            <TypeIcon size={18} className="text-red-700" />
            Typography
          </span>
        }
      >
        <div className="flex flex-col gap-2">
          <div className="text-sm text-district-accent-1">
            Customize district typography by role.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {typographyWithDefaults.map((t) => (
              <div
                key={t.role ?? t.id}
                className="border rounded bg-white p-3 shadow-sm text-slate-900 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase text-slate-500 mb-1">
                      {t.role
                        ? FONT_ROLE_LABELS[t.role as FontRole]
                        : "Typography"}
                    </div>
                    <div className="font-semibold text-slate-900">
                      {t.font_name || "Not set"}
                    </div>
                    <div className="text-xs text-slate-600 capitalize">
                      Availability: {t.availability ?? "system"}
                    </div>
                  </div>
                  {t.role && (
                    <button
                      onClick={() => {
                        setSelectedTypographyRole(t.role as string);
                        setShowTypographyEditor(true);
                      }}
                      className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {t.usage_rules && (
                  <div className="text-sm text-slate-700 italic">
                    {t.usage_rules}
                  </div>
                )}
                <div className="text-xs text-slate-600">
                  Weights:{" "}
                  {Array.isArray(t.weights) && t.weights.length > 0
                    ? t.weights.join(", ")
                    : "None"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </AccordionCard>

      {/* FONT FILES */}
      {/* <AccordionCard
        variant="district"
        title={
          <span className="flex items-center gap-2 text-slate-50">
            <TypeIcon size={18} className="text-orange-300" />
            Font Files
          </span>
        }
      >
        {data.fonts.length === 0 ? (
          <div className="text-slate-700">No font files uploaded.</div>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.fonts.map((font) => (
              <li key={font.id} className="text-slate-800">
                {font.family} — {font.weight ?? "regular"}{" "}
                <span className="text-slate-600 text-sm">(uploaded)</span>
              </li>
            ))}
          </ul>
        )}
      </AccordionCard> */}

      {/* Branding preview of applied tokens */}
      {/* <div className="rounded-lg border border-district-primary-1 bg-district-primary-1/40 p-4 text-sm">
        <div className="font-semibold mb-2">Preview</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded border border-district-secondary-1 bg-district-accent-0 p-3">
            <div className="text-xs uppercase text-district-secondary-0/80 mb-1">
              Background: primary-0
            </div>
            <div className="text-district-secondary-0 font-medium">
              Text: secondary-0
            </div>
          </div>
          <div className="rounded border border-district-accent-1 bg-district-secondary-1 p-3">
            <div className="text-xs uppercase text-district-secondary-2 mb-1">
              Surface: white
            </div>
            <div className="text-district-secondary-1 font-medium">
              Text: primary-1
            </div>
          </div>
          <div className="rounded border border-district-accent-1 bg-district-accent-0 p-3">
            <div className="text-xs uppercase text-district-secondary-0/80 mb-1">
              Accent: accent-0
            </div>
            <div className="text-district-secondary-0 font-medium">
              Button/link text
            </div>
          </div>
        </div>
      </div> */}

      {/* Typography visual showcase */}
      <TypographyShowcase />
    </div>
  );
}
