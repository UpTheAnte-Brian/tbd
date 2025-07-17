"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import type { Feature, FeatureCollection, Geometry } from "geojson";

interface DistrictProperties {
  SDORGID: string;
  SDORGNAME?: string;
  CNTYNAME?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow extra props
}

export default function MapWithTable() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [features, setFeatures] = useState<
    Feature<Geometry, DistrictProperties>[]
  >([]);

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: "weekly",
    });

    loader.load().then(() => {
      if (!mapRef.current) return;

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 44.745, lng: -93.523 },
        zoom: 7,
      });

      // Load GeoJSON from Supabase
      fetch("/api/districts")
        .then((res) => res.json())
        .then((geojson: FeatureCollection<Geometry, DistrictProperties>) => {
          map.data.addGeoJson(geojson);
          setFeatures(geojson.features);
        });
    });
  }, []);

  return (
    <div className="flex h-screen">
      <aside className="w-96 overflow-auto bg-black text-white p-4">
        <h2 className="text-xl font-bold mb-2">Districts</h2>
        <ul>
          {features.map((feature) => (
            <li key={feature.properties.SDORGID}>
              {feature.properties.SDORGID} -{" "}
              {feature.properties.SDORGNAME ?? "Unnamed"}
            </li>
          ))}
        </ul>
      </aside>
      <div ref={mapRef} className="flex-1" />
    </div>
  );
}
