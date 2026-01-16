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

export default function LayerLegend({
  visibleLayers,
  geometriesByType,
  title,
  className,
}: Props) {
  const items = visibleLayers
    .map((layer) => {
      const rows = getLayerRows(layer, geometriesByType);
      if (!rows.length) return null;
      const sources = Array.from(
        new Set(rows.map((row) => row.source).filter(Boolean))
      ) as string[];
      const sourceLines = sources.length
        ? sources.map(formatSourceLine)
        : ["Source: unavailable"];
      return {
        geometryType: layer.geometryType,
        label: layer.label,
        sourceLines,
      };
    })
    .filter(
      (
        item
      ): item is {
        geometryType: string;
        label: string;
        sourceLines: string[];
      } => Boolean(item)
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
            <div className="text-sm font-semibold">{item.label}</div>
            <div className="text-xs opacity-70 space-y-1">
              {item.sourceLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
