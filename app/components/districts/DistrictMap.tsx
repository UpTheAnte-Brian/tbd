"use client";
import {
  GoogleMap,
  Polygon,
  LoadScriptNext,
  Libraries,
} from "@react-google-maps/api";
const googleApiLibraries = process.env.NEXT_PUBLIC_GOOGLE_LIBRARIES;
const googleApiLibrariesArray = (
  googleApiLibraries ? googleApiLibraries.split(",") : []
) as Libraries;
import { useEffect, useRef, useState } from "react";
import { DistrictWithFoundation } from "@/app/lib/types";
import { getBoundsFromGeoJSON } from "@/app/lib/getBoundsFromGeoJSON";

const containerStyle = {
  width: "100%",
  height: "400px",
};

export default function DistrictMap({ d }: { d: DistrictWithFoundation }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [paths, setPaths] = useState<google.maps.LatLngLiteral[][]>([]);

  // Convert GeoJSON coords → LatLngLiterals
  useEffect(() => {
    if (!d.geometry) return;
    if (d.geometry.type === "Polygon") {
      const coords = d.geometry.coordinates[0].map(([lng, lat]) => ({
        lat,
        lng,
      }));
      setPaths([coords]);
    } else if (d.geometry.type === "MultiPolygon") {
      const multi = d.geometry.coordinates.map((poly) =>
        poly[0].map(([lng, lat]) => ({ lat, lng }))
      );
      setPaths(multi);
    }
  }, [d]);

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    const bounds = getBoundsFromGeoJSON(d);
    map.fitBounds(bounds);
  };

  return (
    <LoadScriptNext
      libraries={googleApiLibrariesArray}
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        onLoad={onLoad}
        options={{
          mapTypeId: "roadmap",
          disableDefaultUI: true,
          backgroundColor: "transparent", // makes the base map transparent
        }}
      >
        {paths.map((p, idx) => (
          <Polygon
            key={idx}
            paths={p}
            options={{
              fillColor: "#2196F3",
              fillOpacity: 0.6,
              strokeColor: "#1976D2",
              strokeWeight: 2,
            }}
          />
        ))}
      </GoogleMap>
    </LoadScriptNext>
  );
}
