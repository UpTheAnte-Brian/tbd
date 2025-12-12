"use client";

import { useMemo } from "react";
import { useBrandingSummary } from "@/app/hooks/useBrandingSummary";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

type Props = {
  districtId: string | null;
  districtName?: string;
};

export default function DistrictPrimaryLogo({
  districtId,
  districtName,
}: Props) {
  const { data, loading, error } = useBrandingSummary(districtId, 0);

  const logoUrl = useMemo(() => {
    if (!data?.logos?.length || !SUPABASE_URL) return null;
    const logos = data.logos;

    const pick = () => {
      // Prefer district_primary + horizontal/full_color
      const primaryHoriz = logos.find((l) => {
        const name = (l.name || "").toLowerCase();
        const cat = (l.category || "").toLowerCase();
        const sub = (l.subcategory || "").toLowerCase();
        return (
          cat.includes("district_primary") &&
          (name.includes("horizontal") ||
            sub.includes("horizontal") ||
            sub.includes("full_color"))
        );
      });
      if (primaryHoriz) return primaryHoriz;

      const primary = logos.find((l) =>
        (l.category || "").toLowerCase().includes("district_primary")
      );
      if (primary) return primary;

      return logos[0];
    };

    const chosen = pick();
    const file =
      chosen.file_svg ||
      chosen.file_png ||
      chosen.file_jpg ||
      chosen.file_eps ||
      null;
    if (!file) return null;

    const version = chosen.updated_at ?? "";
    const hasPath = file.includes("/");
    const inferredPath = hasPath
      ? file
      : `${chosen.district_id}/district/${chosen.id}/${file}`;

    return `${SUPABASE_URL}/storage/v1/object/public/branding-logos/${inferredPath}?v=${version}`;
  }, [data]);

  if (!districtId) {
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
