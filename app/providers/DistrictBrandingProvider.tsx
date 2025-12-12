"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useBrandingSummary } from "@/app/hooks/useBrandingSummary";
import { BrandingSummary, BrandingTypography } from "@/app/lib/types/types";

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
  initialData?: BrandingSummary | null;
  children: React.ReactNode;
}

function buildColorVars(data: BrandingSummary | null) {
  if (!data?.palettes || data.palettes.length === 0) return {};

  const vars: Record<string, string> = {};

  // Resolve primary palette (role=primary else first)
  const primaryPalette =
    data.palettes.find((p) => p.role === "primary")?.colors ??
    data.palettes[0]?.colors;

  if (primaryPalette && primaryPalette.length > 0) {
    const primary0 = primaryPalette[0];
    const primary1 = primaryPalette[1] ?? primary0;
    const primary2 = primaryPalette[2] ?? primary1;

    vars["--district-primary-0"] = primary0;
    vars["--district-primary-1"] = primary1;
    vars["--district-primary-2"] = primary2;

    // Secondary tokens map to lighter text defaults.
    vars["--district-secondary-0"] = primary1;
    vars["--district-secondary-1"] = primary0;
    vars["--district-secondary-2"] = primary1;

    // Resolve accent palette (role=accent else fallback to primary)
    const accentPalette =
      data.palettes.find((p) => p.role === "accent")?.colors ?? primaryPalette;
    vars["--district-accent-0"] = accentPalette[0] ?? primary0;
    vars["--district-accent-1"] = accentPalette[1] ?? primary1;
    vars["--district-accent-2"] = accentPalette[2] ?? primary2;
  }

  data.palettes.forEach((palette) => {
    palette.colors.forEach((color, idx) => {
      const varName = `--district-${palette.name
        .toLowerCase()
        .replace(/\s+/g, "-")}-${idx}`;
      vars[varName] = color;
    });
  });

  return vars;
}

export function DistrictBrandingProvider({
  districtId,
  initialData = null,
  children,
}: Props) {
  const { data } = useBrandingSummary(districtId, 0);
  const summary = data ?? initialData ?? null;
  const debugBranding =
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_BRANDING_DEBUG === "true";

  // Extract colors from palettes into a flat CSS variable map
  const colorVars = useMemo(() => buildColorVars(summary), [summary]);

  const typography = useMemo(() => {
    if (!summary?.typography || summary.typography.length === 0) {
      return {
        heading: FALLBACK_FONT,
        body: FALLBACK_FONT,
        accent: FALLBACK_FONT,
      };
    }

    const t = summary.typography[0] as BrandingTypography; // primary typeface for the district

    return {
      heading: t.font_name || FALLBACK_FONT,
      body: t.font_name || FALLBACK_FONT,
      accent: t.font_name || FALLBACK_FONT,
    };
  }, [summary]);

  // Inject CSS variables into <head>
  useEffect(() => {
    if (!colorVars || Object.keys(colorVars).length === 0) return;

    const root = document.documentElement;

    Object.entries(colorVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    return () => {
      // cleanup if district changes
      Object.keys(colorVars).forEach((key) => root.style.removeProperty(key));
    };
  }, [colorVars]);

  // Debug logging: snapshot applied vars and watch for style mutations
  useEffect(() => {
    if (!debugBranding) return;
    if (!colorVars || Object.keys(colorVars).length === 0) return;
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const snapshot: Record<string, string> = {};
    Object.keys(colorVars).forEach((k) => {
      snapshot[k] = getComputedStyle(root).getPropertyValue(k).trim();
    });
    console.log("[branding] applied vars snapshot", snapshot);

    const observer = new MutationObserver(() => {
      const current: Record<string, string> = {};
      Object.keys(colorVars).forEach((k) => {
        current[k] = getComputedStyle(root).getPropertyValue(k).trim();
      });
      console.log("[branding] mutation detected", current);
    });
    observer.observe(root, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [colorVars, debugBranding]);

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
