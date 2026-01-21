"use client";

import { createContext, useContext, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  buildBrandCssVars,
  DEFAULT_BRAND_COLORS,
  DEFAULT_BRAND_TYPOGRAPHY,
  type BrandColorTokens,
  type BrandTypographyTokens,
  type ResolvedBranding,
} from "@/app/lib/branding/resolveBranding";

type BrandingContextValue = {
  entityId: string | null;
  colors: BrandColorTokens;
  fonts: BrandTypographyTokens;
  cssVars: Record<string, string>;
};

const fallbackTokens: ResolvedBranding = {
  colors: DEFAULT_BRAND_COLORS,
  typography: DEFAULT_BRAND_TYPOGRAPHY,
};

const BrandingContext = createContext<BrandingContextValue>({
  entityId: null,
  colors: DEFAULT_BRAND_COLORS,
  fonts: DEFAULT_BRAND_TYPOGRAPHY,
  cssVars: {},
});

export function EntityThemeProviderClient({
  entityId,
  resolved,
  children,
}: {
  entityId: string | null;
  resolved?: ResolvedBranding | null;
  children: ReactNode;
}) {
  const tokens = resolved ?? fallbackTokens;
  const cssVars = useMemo(() => buildBrandCssVars(tokens), [tokens]);
  const contextValue = useMemo(
    () => ({
      entityId,
      colors: tokens.colors,
      fonts: tokens.typography,
      cssVars,
    }),
    [entityId, tokens, cssVars],
  );

  const style: CSSProperties = {
    ...(cssVars as CSSProperties),
    fontFamily: "var(--brand-font-family)",
  };

  return (
    <BrandingContext.Provider value={contextValue}>
      <div style={style}>{children}</div>
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
