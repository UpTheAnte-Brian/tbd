"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useBrandingSummary } from "@/app/hooks/useBrandingSummary";
import { BrandingSummary, BrandingTypography } from "@/app/lib/types/types";

const FALLBACK_FONT = "Inter, sans-serif";

interface DistrictBrandingContextValue {
  districtId: string | null;
  colors: Record<string, string>;
  fonts: {
    header1?: string;
    header2?: string;
    subheader?: string;
    body?: string;
    logo?: string;
    // legacy fallback keys
    heading?: string;
    accent?: string;
    display?: string;
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
  const secondaryPalette =
    data.palettes.find((p) => p.role === "secondary")?.colors ?? null;

  if (primaryPalette && primaryPalette.length > 0) {
    const primary0 = primaryPalette[0];
    const primary1 = primaryPalette[1] ?? primary0;
    const primary2 = primaryPalette[2] ?? primary1;

    vars["--district-primary-0"] = primary0;
    vars["--district-primary-1"] = primary1;
    vars["--district-primary-2"] = primary2;

    // Secondary tokens map to lighter text defaults.
    if (secondaryPalette && secondaryPalette.length > 0) {
      vars["--district-secondary-0"] = secondaryPalette[0] ?? primary1;
      vars["--district-secondary-1"] = secondaryPalette[1] ?? primary0;
      vars["--district-secondary-2"] = secondaryPalette[2] ?? primary1;
    } else {
      vars["--district-secondary-0"] = primary1;
      vars["--district-secondary-1"] = primary0;
      vars["--district-secondary-2"] = primary1;
    }

    // Resolve accent palette (role=accent else fallback to primary)
    const accentPalette =
      data.palettes.find((p) => p.role === "accent")?.colors ?? primaryPalette;
    vars["--district-accent-0"] = accentPalette[0] ?? primary0;
    vars["--district-accent-1"] = accentPalette[1] ?? primary1;
    vars["--district-accent-2"] = accentPalette[2] ?? primary2;
  }

  data.palettes.forEach((palette) => {
    const paletteColors = Array.isArray(palette.colors)
      ? palette.colors
      : [];
    paletteColors.forEach((color, idx) => {
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
        header1: FALLBACK_FONT,
        header2: FALLBACK_FONT,
        subheader: FALLBACK_FONT,
        body: FALLBACK_FONT,
        logo: FALLBACK_FONT,
        heading: FALLBACK_FONT,
        accent: FALLBACK_FONT,
        display: FALLBACK_FONT,
      };
    }

    const byRole = (role: string) =>
      summary.typography.find((t) => t.role === role)?.font_name ?? null;

    const fallback = summary.typography[0] as BrandingTypography; // fallback primary typeface
    const body = byRole("body") ?? fallback.font_name ?? FALLBACK_FONT;
    const header1 = byRole("header1") ?? fallback.font_name ?? body;
    const header2 = byRole("header2") ?? header1;
    const subheader = byRole("subheader") ?? header2;
    const display = byRole("display") ?? header1;
    const logo = byRole("logo") ?? display;
    const accent = byRole("accent") ?? header2;

    return {
      body: body || FALLBACK_FONT,
      header1: header1 || FALLBACK_FONT,
      header2: header2 || FALLBACK_FONT,
      subheader: subheader || FALLBACK_FONT,
      display: display || FALLBACK_FONT,
      heading: header1 || FALLBACK_FONT, // legacy alias
      accent: accent || FALLBACK_FONT,
      logo: logo || FALLBACK_FONT,
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

  // Apply font variables to :root/body
  useEffect(() => {
    if (!typography) return;
    const root = document.documentElement;
    const body = document.body;
    const font = typography.body || FALLBACK_FONT;

    root.style.setProperty("--district-font-family", font);
    if (typography.header1) {
      root.style.setProperty("--district-font-header1", typography.header1);
      root.style.setProperty("--district-font-heading", typography.header1);
    }
    if (typography.header2) {
      root.style.setProperty("--district-font-header2", typography.header2);
    }
    if (typography.subheader) {
      root.style.setProperty("--district-font-subheader", typography.subheader);
    }
    if (typography.display) {
      root.style.setProperty("--district-font-display", typography.display);
    }
    if (typography.logo) {
      root.style.setProperty("--district-font-logo", typography.logo);
    }
    body.style.fontFamily = font;

    return () => {
      root.style.removeProperty("--district-font-family");
      root.style.removeProperty("--district-font-header1");
      root.style.removeProperty("--district-font-header2");
      root.style.removeProperty("--district-font-subheader");
      root.style.removeProperty("--district-font-display");
      root.style.removeProperty("--district-font-logo");
      root.style.removeProperty("--district-font-heading");
      body.style.fontFamily = "";
    };
  }, [typography]);

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
