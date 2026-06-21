"use client";

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { ResolvedEntityAssets } from "@/app/data/entity-assets";
import { DEFAULT_ENTITY_LOGO_URL } from "@/app/lib/branding/resolveBranding";

type BrandAssets = {
  primaryLogoUrl: string | null;
};

type BrandingAssetsContextValue = {
  entityId: string | null;
  assets: BrandAssets;
  isFallback: boolean;
};

const fallbackAssets: BrandAssets = {
  primaryLogoUrl: DEFAULT_ENTITY_LOGO_URL,
};

const BrandingAssetsContext = createContext<BrandingAssetsContextValue>({
  entityId: null,
  assets: fallbackAssets,
  isFallback: true,
});

type Props = {
  entityId: string | null;
  resolvedAssets?: ResolvedEntityAssets | null;
  children: ReactNode;
};

export function EntityBrandingAssetsProviderClient({
  entityId,
  resolvedAssets,
  children,
}: Props) {
  const value = useMemo(() => {
    const resolvedEntityId = resolvedAssets?.entityId ?? entityId ?? null;
    const primaryLogoUrl =
      resolvedAssets?.primaryLogoUrl ?? fallbackAssets.primaryLogoUrl;
    return {
      entityId: resolvedEntityId,
      assets: { primaryLogoUrl },
      isFallback: !resolvedAssets?.primaryLogoUrl,
    };
  }, [entityId, resolvedAssets]);

  return (
    <BrandingAssetsContext.Provider value={value}>
      {children}
    </BrandingAssetsContext.Provider>
  );
}

export function useBrandAssets() {
  return useContext(BrandingAssetsContext);
}
