"use client";

import Image from "next/image";
import { BrandAssetUploader } from "@/app/components/branding/BrandAssetUploader";
import { useBrandingSummary } from "@/app/hooks/useBrandingSummary";
import type { BrandingSummary as BrandingSummaryType } from "@/app/lib/types/types";
import { useMemo, useState } from "react";
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
  districtShortname: string;
}

export function BrandingPanel({ districtId, districtShortname }: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedLogo, setSelectedLogo] = useState<{
    id: string;
    category?: string;
    subcategory?: string;
  } | null>(null);
  const [editingPalette, setEditingPalette] = useState<{
    id?: string;
    name: string;
    colors: string[];
    role?: string;
  } | null>(null);
  const { data, loading, error } = useBrandingSummary(
    districtId,
    refreshKey,
    "district"
  );
  const [showTypographyEditor, setShowTypographyEditor] = useState(false);
  const [selectedTypographyRole, setSelectedTypographyRole] =
    useState<string>("body");
  const typographyWithDefaults = useMemo(() => {
    if (!districtId) return [];
    return FONT_ROLES.map((role) => {
      const row =
        data?.typography.find((t) => t.role === role) ||
        (role === "body"
          ? data?.typography.find((t) => t.role === "body")
          : null);
      if (row) return row;
      const defaults = DEFAULT_TYPOGRAPHY[role];
      return {
        id: `default-${role}`,
        district_id: districtId,
        entity_id: districtId,
        entity_type: "district",
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
  }, [data?.typography, districtId]);

  const logosGrouped = useMemo(() => {
    if (!data) return {};

    type Logo = BrandingSummaryType["logos"][number];

    return data.logos.reduce<Record<string, Logo[]>>((acc, logo) => {
      const key = logo.category || "other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(logo);
      return acc;
    }, {} as Record<string, Logo[]>);
  }, [data]);

  const maxPaletteColors = useMemo(() => {
    if (!data?.palettes?.length) return 0;
    return Math.max(0, ...data.palettes.map((p) => p.colors?.length ?? 0));
  }, [data]);
  const colorColumns = Math.max(1, maxPaletteColors);
  const paletteGridTemplate = `minmax(220px, 2fr) 90px repeat(${colorColumns}, minmax(52px, 1fr))`;

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

  if (!data) {
    return <div>No branding data found.</div>;
  }

  return (
    <div className="space-y-8 bg-district-secondary-1 text-district-secondary-0 p-6 rounded">
      {/* Edit Drawer */}
      {selectedLogo && districtId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end items-center">
          <div className="w-full max-w-md max-h-[calc(100vh-2rem)] bg-white shadow-xl p-4 overflow-y-auto rounded-lg mr-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-district-secondary-0">
                Upload / Replace Logo
              </h3>
              <button
                className="text-gray-500 hover:text-gray-800"
                onClick={() => setSelectedLogo(null)}
              >
                ✕
              </button>
            </div>
            <BrandAssetUploader
              districtId={districtId}
              targetLogoId={selectedLogo.id}
              defaultCategory={selectedLogo.category ?? ""}
              defaultSubcategory={selectedLogo.subcategory ?? ""}
              schools={data.schools?.map((s) => ({
                id: s.id,
                name: s.school_name,
              }))}
              onCancel={() => setSelectedLogo(null)}
              onUploaded={() => {
                setRefreshKey((k) => k + 1);
                setSelectedLogo(null);
              }}
            />
          </div>
        </div>
      )}

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
              districtShortname={districtShortname}
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

      {/* LOGOS */}
      <AccordionCard
        variant="district"
        title={
          <span className="flex items-center gap-2 text-slate-50">
            <ImageIcon size={18} className="text-blue-300" />
            Logos
          </span>
        }
        defaultOpen={false}
      >
        <div className="space-y-6">
          {Object.entries(logosGrouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-md font-semibold uppercase tracking-wide text-white mb-2">
                {category.replace("_", " ")}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {items.map((logo) => {
                  const file =
                    logo.file_png ||
                    logo.file_svg ||
                    logo.file_jpg ||
                    logo.file_eps ||
                    null;
                  return (
                    <div
                      key={logo.id}
                      className="border rounded-lg p-3 bg-white shadow-sm flex flex-col items-center cursor-pointer hover:ring-2 hover:ring-blue-200"
                      onClick={() =>
                        setSelectedLogo({
                          id: logo.id,
                          category: logo.category,
                          subcategory: logo.subcategory ?? undefined,
                        })
                      }
                    >
                      {file ? (
                        <>
                          <div className="text-sm font-medium text-slate-800 text-center mb-2">
                            {logo.name}
                          </div>
                          <Image
                            src={`${SUPABASE_URL}/storage/v1/object/public/branding-logos/${file}?v=${
                              logo.updated_at ?? logo.created_at ?? ""
                            }`}
                            alt={logo.name}
                            width={150}
                            height={150}
                            className="object-contain max-h-32"
                            onError={(e) => {
                              // Hide broken images for placeholders without files
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          <div className="mt-2 text-xs text-blue-700 underline">
                            Replace
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-medium text-slate-800 text-center mb-2">
                            {logo.name} - {logo.id}
                          </div>
                          <div className="w-full h-24 flex items-center justify-center border rounded bg-gray-50 text-gray-400">
                            No file uploaded
                          </div>
                          <div className="mt-2 text-xs text-blue-700 underline">
                            Upload
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </AccordionCard>

      {/* PATTERNS */}
      {/* <AccordionCard
        variant="district"
        title={
          <span className="flex items-center gap-2 text-slate-50">
            <LayersIcon size={18} className="text-green-300" />
            Brand Patterns
          </span>
        }
      >
        {data.patterns.length === 0 ? (
          <div className="text-slate-700 mt-2">No patterns defined.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {data.patterns.map((pattern) => {
              const file = pattern.file_png || pattern.file_svg;
              return (
                <div
                  key={pattern.id}
                  className="border rounded p-3 bg-white shadow-sm flex flex-col items-center"
                >
                  {file ? (
                    <Image
                      src={`${SUPABASE_URL}/storage/v1/object/public/branding-patterns/${file}`}
                      alt={pattern.pattern_type}
                      width={150}
                      height={150}
                      className="object-contain max-h-32"
                    />
                  ) : (
                    <div className="text-gray-400 italic">No file</div>
                  )}
                  <div className="text-sm mt-2">
                    {pattern.pattern_type === "small"
                      ? "Small Pattern"
                      : "Large Pattern"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AccordionCard> */}

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
        {data.palettes.length === 0 ? (
          <div className="text-slate-700">No color palettes defined.</div>
        ) : (
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

              {data.palettes.map((palette) => (
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
