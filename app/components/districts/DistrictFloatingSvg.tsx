"use client";
import { DistrictFeature } from "@/app/lib/types/types";
import { geoPath, geoMercator } from "d3-geo";

export default function DistrictSvgMap({ d }: { d: DistrictFeature }) {
  if (!d.geometry) return null;

  // Project GeoJSON into an SVG path
  const projection = geoMercator().fitSize(
    [400, 400],
    d as DistrictFeature
  );
  const pathGen = geoPath(projection);

  return (
    <svg viewBox="0 0 400 400" className="w-full h-96">
      <path
        d={pathGen(d as DistrictFeature) || ""}
        fill="#2196F3"
        stroke="#1976D2"
        strokeWidth={2}
        className="drop-shadow-lg"
      />
    </svg>
  );
}
