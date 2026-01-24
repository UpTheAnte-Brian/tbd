"use client";

import { useMemo, useState } from "react";
import LayerLegend, {
  buildLayerLegendItems,
} from "@/app/components/map/LayerLegend";
import type { EntityGeometriesByType } from "@/app/lib/geo/entity-geometries";
import type { GeometryLayerConfig } from "@/app/lib/map/layers";

type Props = {
  visibleLayers: GeometryLayerConfig[];
  geometriesByType: EntityGeometriesByType;
  loadingByType?: Record<string, boolean>;
  className?: string;
};

export default function LayerSources({
  visibleLayers,
  geometriesByType,
  loadingByType,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasItems = useMemo(
    () =>
      buildLayerLegendItems(visibleLayers, geometriesByType, loadingByType)
        .length > 0,
    [visibleLayers, geometriesByType, loadingByType]
  );

  if (!hasItems) return null;

  return (
    <div className={className}>
      <div
        className="relative inline-flex items-center"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <button
          type="button"
          className="text-xs uppercase text-brand-secondary-2 underline decoration-dotted underline-offset-2"
          aria-label="Sources"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          Sources
        </button>
        {open ? (
          <div className="absolute left-0 top-5 z-10">
            <div className="w-72 max-w-[80vw] rounded-lg border border-brand-secondary-0 bg-brand-secondary-1 p-3 text-brand-primary-1 shadow-lg">
              <LayerLegend
                visibleLayers={visibleLayers}
                geometriesByType={geometriesByType}
                loadingByType={loadingByType}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
