"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useBrandingSummary } from "@/app/hooks/useBrandingSummary";
import { BrandingTypography } from "@/app/lib/types/types";

const FALLBACK_FONT = "Inter, sans-serif";

interface DistrictBrandingContextValue {
  districtId: string | null;
  colors: Record<string, string>;
  fonts: {
    heading?: string;
    body?: string;
    accent?: string;
  };
}

const DistrictBrandingContext = createContext<DistrictBrandingContextValue>({
  districtId: null,
  colors: {},
  fonts: {},
});

interface Props {
  districtId: string | null;
  children: React.ReactNode;
}

export function DistrictBrandingProvider({ districtId, children }: Props) {
  const { data } = useBrandingSummary(districtId, 0);

  // Extract colors from palettes into a flat CSS variable map
  const colorVars = useMemo(() => {
    if (!data?.palettes) return {};

    const vars: Record<string, string> = {};

    // Resolve primary palette (role=primary else first)
    const primaryPalette =
      data.palettes.find((p) => p.role === "primary")?.colors ??
      data.palettes[0]?.colors ??
      [];
    const primary0 = primaryPalette[0] ?? "#0b1223";
    const primary1 = primaryPalette[1] ?? "#111827";
    const primary2 = primaryPalette[2] ?? "#f5f5f5";
    vars["--district-primary-0"] = primary0;
    vars["--district-primary-1"] = primary1;
    vars["--district-primary-2"] = primary2;

    // Resolve accent palette (role=accent else fallback to primary)
    const accentPalette =
      data.palettes.find((p) => p.role === "accent")?.colors ?? primaryPalette;
    vars["--district-accent-0"] = accentPalette[0] ?? primary0;
    vars["--district-accent-1"] = accentPalette[1] ?? primary1;
    vars["--district-accent-2"] = accentPalette[2] ?? primary2;

    data.palettes.forEach((palette) => {
      palette.colors.forEach((color, idx) => {
        const varName = `--district-${palette.name
          .toLowerCase()
          .replace(/\s+/g, "-")}-${idx}`;
        vars[varName] = color;
      });
    });

    return vars;
  }, [data]);

  const typography = useMemo(() => {
    if (!data?.typography || data.typography.length === 0) {
      return {
        heading: FALLBACK_FONT,
        body: FALLBACK_FONT,
        accent: FALLBACK_FONT,
      };
    }

    const t = data.typography[0] as BrandingTypography; // primary typeface for the district

    return {
      heading: t.font_name || FALLBACK_FONT,
      body: t.font_name || FALLBACK_FONT,
      accent: t.font_name || FALLBACK_FONT,
    };
  }, [data]);

  // Inject CSS variables into <head>
  useEffect(() => {
    if (!colorVars) return;

    const root = document.documentElement;

    Object.entries(colorVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    return () => {
      // cleanup if district changes
      Object.keys(colorVars).forEach((key) => root.style.removeProperty(key));
    };
  }, [colorVars]);

  const value: DistrictBrandingContextValue = {
    districtId,
    colors: colorVars,
    fonts: typography,
  };
  console.log("Branding Summary: ", value);

  return (
    <DistrictBrandingContext.Provider value={value}>
      {children}
    </DistrictBrandingContext.Provider>
  );
}

export function useDistrictBranding() {
  return useContext(DistrictBrandingContext);
}
