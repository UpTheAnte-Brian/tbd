"use client";

import { useMemo } from "react";
import PaletteVisualAids from "@/app/components/entities/tabs/branding/PaletteVisualAids";
import { toPaletteMap } from "@/app/lib/branding/resolveBranding";
import type { BrandingPalette } from "@/app/lib/types/types";

type Props = {
  palettes: BrandingPalette[];
  entityName: string;
};

export default function BrandingTips({ palettes, entityName }: Props) {
  const palettePreview = useMemo(() => {
    const paletteMap = toPaletteMap(palettes, entityName);
    return {
      primary: paletteMap.primary.colors,
      secondary: paletteMap.secondary.colors,
      accent: paletteMap.accent.colors,
    };
  }, [palettes, entityName]);

  return (
    <div className="space-y-4">
      <PaletteVisualAids palette={palettePreview} />
      <div className="text-xs text-brand-secondary-0 opacity-80">
        Tip: Primary-1 is typically a light background, Secondary-1 is "ink",
        and Accent-0 is your CTA.
      </div>
    </div>
  );
}
