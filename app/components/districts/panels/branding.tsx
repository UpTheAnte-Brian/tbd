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
  Layers as LayersIcon,
} from "lucide-react";
import ColorPaletteEditor from "@/app/components/branding/ColorPaletteEditor";
import AccordionCard from "@/app/components/user/AccordionCard";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

interface Props {
  districtId: string | null;
}

export function BrandingPanel({ districtId }: Props) {
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
  } | null>(null);
  const { data, loading, error } = useBrandingSummary(districtId, refreshKey);

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
    <div className="space-y-8 bg-district-primary-0 text-district-primary-2 p-6 rounded">
      {/* Branding preview of applied tokens */}
      <div className="rounded-lg border border-district-primary-1 bg-district-primary-1/40 p-4 text-sm">
        <div className="font-semibold mb-2">Preview</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded border border-district-primary-1 bg-district-primary-0 p-3">
            <div className="text-xs uppercase text-district-primary-2/80 mb-1">
              Background: primary-0
            </div>
            <div className="text-district-primary-2 font-medium">
              Text: primary-2
            </div>
          </div>
          <div className="rounded border border-district-primary-1 bg-white p-3">
            <div className="text-xs uppercase text-district-primary-1/80 mb-1">
              Surface: white
            </div>
            <div className="text-district-primary-1 font-medium">
              Text: primary-1
            </div>
          </div>
          <div className="rounded border border-district-primary-1 bg-district-accent-0 p-3">
            <div className="text-xs uppercase text-district-primary-2/80 mb-1">
              Accent: accent-0
            </div>
            <div className="text-district-primary-2 font-medium">
              Button/link text
            </div>
          </div>
        </div>
      </div>

      {/* Edit Drawer */}
      {selectedLogo && districtId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div className="w-full max-w-md h-full bg-white shadow-xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-district-primary-2">
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
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div className="w-full max-w-md h-full bg-white shadow-xl p-4 overflow-y-auto">
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

      {/* LOGOS */}
      <AccordionCard
        title={
          <span className="flex items-center gap-2 text-slate-50">
            <ImageIcon size={18} className="text-blue-300" />
            Logos
          </span>
        }
        defaultOpen
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
                              logo.updated_at ?? ""
                            }`}
                            alt={logo.name}
                            width={150}
                            height={150}
                            className="object-contain max-h-32"
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
      <AccordionCard
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
      </AccordionCard>

      {/* PALETTES */}
      <AccordionCard
        title={
          <span className="flex items-center gap-2 text-slate-50">
            <PaletteIcon size={18} className="text-gray-300" />
            Color Palettes
          </span>
        }
      >
        {data.palettes.length === 0 ? (
          <div className="text-slate-700">No color palettes defined.</div>
        ) : (
          data.palettes.map((palette) => (
            <div
              key={palette.id}
              className="mt-2 w-36 flex flex-row rounded border-white"
            >
              <div className="flex items-center justify-between">
                <h3 className="w-12 text-md mx-4 font-medium text-white">
                  {palette.name}
                </h3>
                <button
                  className="px-3 py-1 rounded bg-slate-700 text-white text-sm hover:bg-slate-800"
                  onClick={() =>
                    setEditingPalette({
                      id: palette.id,
                      name: palette.name,
                      colors: palette.colors,
                    })
                  }
                >
                  Edit
                </button>
              </div>

              <div className="flex gap-2 mt-2">
                {palette.colors.map((color) => (
                  <div
                    key={color}
                    className="w-10 h-10 rounded border shadow-sm"
                    style={{ backgroundColor: color }}
                  ></div>
                ))}
              </div>
            </div>
          ))
        )}

        <button
          className="mt-4 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() =>
            setEditingPalette({
              id: undefined,
              name: "",
              colors: [],
            })
          }
        >
          + Add Palette
        </button>
      </AccordionCard>

      {/* TYPOGRAPHY */}
      <AccordionCard
        title={
          <span className="flex items-center gap-2 text-slate-50">
            <TypeIcon size={18} className="text-red-300" />
            Typography
          </span>
        }
      >
        {data.typography.length === 0 ? (
          <div className="text-slate-700 mt-2">
            No typography rules defined.
          </div>
        ) : (
          data.typography.map((t) => (
            <div
              key={t.id}
              className="mt-3 p-3 border rounded bg-white shadow-sm text-slate-900"
            >
              <div>
                <span className="font-medium text-slate-800">Font Name:</span>{" "}
                <span className="text-slate-900">{t.font_name}</span>
              </div>
              {/* <div>
                <span className="font-medium text-slate-800">Body:</span>{" "}
                <span className="text-slate-900">{t.body_font}</span>
              </div>
              <div>
                <span className="font-medium text-slate-800">Accent:</span>{" "}
                <span className="text-slate-900">{t.accent_font}</span>
              </div> */}
              {t.usage_rules && (
                <div className="mt-1 text-sm text-slate-700 italic">
                  {t.usage_rules}
                </div>
              )}
            </div>
          ))
        )}
      </AccordionCard>

      {/* FONT FILES */}
      <AccordionCard
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
      </AccordionCard>
    </div>
  );
}
