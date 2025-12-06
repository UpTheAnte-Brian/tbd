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
    <div className="space-y-8">
      {/* Edit Drawer */}
      {selectedLogo && districtId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div className="w-full max-w-md h-full bg-white shadow-xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload / Replace Logo</h3>
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

      {/* LOGOS */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <ImageIcon size={20} className="text-blue-500" />
          Logos
        </h2>
        <div className="mt-4 space-y-6">
          {Object.entries(logosGrouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-md font-medium capitalize text-gray-700">
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
                          <Image
                            src={`${SUPABASE_URL}/storage/v1/object/public/branding-logos/${file}?v=${
                              logo.updated_at ?? ""
                            }`}
                            alt={logo.name}
                            width={150}
                            height={150}
                            className="object-contain max-h-32"
                          />
                          <div className="text-sm mt-2 text-center text-gray-700">
                            {logo.name}
                          </div>
                          <div className="mt-1 text-xs text-blue-600 underline">
                            Replace
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-full h-24 flex items-center justify-center border rounded bg-gray-50 text-gray-400">
                            No file uploaded
                          </div>
                          <div className="text-sm mt-2 text-center text-gray-700">
                            {logo.name} - {logo.id}
                          </div>
                          <div className="mt-1 text-xs text-blue-600 underline">
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
      </section>

      {/* PATTERNS */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <LayersIcon size={20} className="text-green-500" />
          Brand Patterns
        </h2>

        {data.patterns.length === 0 ? (
          <div className="text-gray-500 mt-2">No patterns defined.</div>
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
      </section>

      {/* PALETTES */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <PaletteIcon size={20} className="text-purple-500" />
          Color Palettes
        </h2>
        {data.palettes.length === 0 ? (
          <div className="text-gray-500">No color palettes defined.</div>
        ) : (
          data.palettes.map((palette) => (
            <div key={palette.id} className="mt-4">
              <h3 className="text-md font-medium">{palette.name}</h3>
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
      </section>

      {/* TYPOGRAPHY */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <TypeIcon size={20} className="text-red-500" />
          Typography
        </h2>
        {data.typography.length === 0 ? (
          <div className="text-gray-500 mt-2">No typography rules defined.</div>
        ) : (
          data.typography.map((t) => (
            <div
              key={t.id}
              className="mt-3 p-3 border rounded bg-white shadow-sm"
            >
              <div>
                <span className="font-medium">Heading:</span> {t.heading_font}
              </div>
              <div>
                <span className="font-medium">Body:</span> {t.body_font}
              </div>
              <div>
                <span className="font-medium">Accent:</span> {t.accent_font}
              </div>
              {t.notes && (
                <div className="mt-1 text-sm text-gray-600 italic">
                  {t.notes}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {/* FONT FILES */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <TypeIcon size={20} className="text-orange-500" />
          Font Files
        </h2>
        {data.fonts.length === 0 ? (
          <div className="text-gray-500">No font files uploaded.</div>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.fonts.map((font) => (
              <li key={font.id} className="text-gray-700">
                {font.family} — {font.weight ?? "regular"}{" "}
                <span className="text-gray-500 text-sm">(uploaded)</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
