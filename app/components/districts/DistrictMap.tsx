"use client";
import { GoogleMap, Polygon } from "@react-google-maps/api";
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
  const worldCoords = [
    { lat: -85, lng: -180 },
    { lat: 85, lng: -180 },
    { lat: 85, lng: 180 },
    { lat: -85, lng: 180 },
  ];

  return (
    // <LoadScriptNext
    //   libraries={googleApiLibrariesArray}
    //   googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
    // >
    <GoogleMap
      mapContainerStyle={containerStyle}
      onLoad={onLoad}
      options={{
        mapTypeId: "roadmap",
        disableDefaultUI: true,
        styles: [
          {
            featureType: "all",
            elementType: "geometry",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ visibility: "on" }, { color: "#e0f7fa" }],
          },
        ],
      }}
    >
      <Polygon
        paths={[worldCoords, ...paths.map((p) => [...p].reverse())]}
        options={{
          fillColor: "black",
          fillOpacity: 0.5,
          strokeWeight: 0,
          clickable: false, // mask should not capture clicks
        }}
      />
      {paths.map((p, idx) => (
        <Polygon
          key={idx}
          paths={p}
          options={{
            fillOpacity: 0,
            strokeColor: "#1976D2",
            strokeWeight: 2,
            clickable: false,
          }}
        />
      ))}
    </GoogleMap>
  );
  {
    /* </LoadScriptNext> */
  }
}
