"use client";

import { DATASET_LABELS, parseSourceTag } from "@/app/lib/geo/datasets";
import type {
  EntityGeometriesByType,
  EntityGeometryRow,
} from "@/app/lib/geo/entity-geometries";
import type { GeometryLayerConfig } from "@/app/lib/map/layers";

type Props = {
  visibleLayers: GeometryLayerConfig[];
  geometriesByType: EntityGeometriesByType;
  title?: string;
  className?: string;
  loadingByType?: Record<string, boolean>;
};

export type LayerLegendItem = {
  geometryType: string;
  label: string;
  sourceLines: string[];
  isLoading: boolean;
};

const getLayerRows = (
  layer: GeometryLayerConfig,
  geometriesByType: EntityGeometriesByType
): EntityGeometryRow[] => {
  const geometryTypes = [
    layer.geometryType,
    ...(layer.fallbackGeometryTypes ?? []),
  ];
  return geometryTypes.flatMap((type) => geometriesByType[type] ?? []);
};

const formatSourceLine = (rawSource: string) => {
  const parsed = parseSourceTag(rawSource);
  if (!parsed) return `Source: ${rawSource}`;
  const label = parsed.label ?? DATASET_LABELS[parsed.dataset_key] ?? parsed.dataset_key;
  return `${label} — ${parsed.version}`;
};

export const buildLayerLegendItems = (
  visibleLayers: GeometryLayerConfig[],
  geometriesByType: EntityGeometriesByType,
  loadingByType?: Record<string, boolean>
): LayerLegendItem[] =>
  visibleLayers
    .map((layer) => {
      const rows = getLayerRows(layer, geometriesByType);
      const isLoading = Boolean(loadingByType?.[layer.geometryType]);
      if (!rows.length && !isLoading) return null;
      const sources = Array.from(
        new Set(rows.map((row) => row.source).filter(Boolean))
      ) as string[];
      const sourceLines = sources.length
        ? sources.map(formatSourceLine)
        : isLoading
          ? []
          : ["Source: unavailable"];
      return {
        geometryType: layer.geometryType,
        label: layer.label,
        sourceLines,
        isLoading,
      };
    })
    .filter((item): item is LayerLegendItem => Boolean(item));

export default function LayerLegend({
  visibleLayers,
  geometriesByType,
  title,
  className,
  loadingByType,
}: Props) {
  const items = buildLayerLegendItems(
    visibleLayers,
    geometriesByType,
    loadingByType
  );

  if (!items.length) return null;

  return (
    <div className={className}>
      {title ? (
        <div className="text-xs uppercase opacity-60">{title}</div>
      ) : null}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.geometryType}>
            <div className="flex items-center justify-between gap-2 text-sm font-semibold">
              <span>{item.label}</span>
              {item.isLoading ? (
                <span className="text-[11px] font-normal text-brand-secondary-2">
                  Loading...
                </span>
              ) : null}
            </div>
            {item.sourceLines.length ? (
              <div className="text-xs opacity-70 space-y-1">
                {item.sourceLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
