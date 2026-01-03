"use client";

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { ResolvedEntityAssets } from "@/app/data/entity-assets";

type BrandAssets = {
  primaryLogoUrl: string | null;
};

type BrandingAssetsContextValue = {
  entityId: string | null;
  assets: BrandAssets;
  isFallback: boolean;
};

const fallbackAssets: BrandAssets = {
  primaryLogoUrl: null,
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
    const primaryLogoUrl = resolvedAssets?.primaryLogoUrl ?? null;
    return {
      entityId: resolvedEntityId,
      assets: { primaryLogoUrl },
      isFallback: !primaryLogoUrl,
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
