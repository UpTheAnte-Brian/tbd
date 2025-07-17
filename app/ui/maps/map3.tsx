"use client";

import { GoogleMap, LoadScript } from "@react-google-maps/api";
import { useEffect, useRef, useState } from "react";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import centroid from "@turf/centroid";

interface DistrictProperties {
  sdorgid: string;
  name?: string;
  SDORGNAME?: string;
  SHORTNAME?: string;
}

interface Row {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

const containerStyle = {
  width: "100%",
  height: "100vh",
  display: "flex",
};

const mapContainerStyle = {
  flex: 1,
};

const asideStyle = {
  width: "400px",
  overflowY: "scroll" as const,
  backgroundColor: "black",
  color: "white",
  padding: "1rem",
};

export default function MapWithDistricts() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;

    fetch("/api/districts")
      .then((res) => res.json())
      .then((geojson: FeatureCollection<Geometry, DistrictProperties>) => {
        map.data.addGeoJson(geojson);
        map.data.setStyle((feature) => {
          const isSelected = feature.getProperty("sdorgid") === selectedId;
          return {
            fillColor: isSelected ? "yellow" : "blue",
            strokeWeight: 1,
            fillOpacity: isSelected ? 0.6 : 0.3,
          };
        });
        map.data.addListener("click", (event: google.maps.Data.MouseEvent) => {
          const clickedFeature = event.feature;
          const clickedId = clickedFeature.getProperty("sdorgid") as string;
          setSelectedId(clickedId);

          // Convert to GeoJSON before passing to Turf
          clickedFeature.toGeoJson((geoJsonFeature) => {
            if (mapRef.current) {
              fitBoundsToFeature(
                mapRef.current,
                geoJsonFeature as Feature<Geometry, DistrictProperties>
              );
            }
          });
        });
        const validRows: Row[] = geojson.features
          .map((f) => {
            const c = centroid(f as Feature<Geometry, DistrictProperties>);
            if (!c || !c.geometry || !c.geometry.coordinates) return null;
            const [lng, lat] = c.geometry.coordinates;

            return {
              id: f.properties.sdorgid,
              label:
                f.properties.SHORTNAME ||
                f.properties.name ||
                f.properties.sdorgid,
              lat,
              lng,
            };
          })
          .filter(Boolean) as Row[];
        console.log("validRows: ", validRows);
        setRows(validRows);

        const bounds = new google.maps.LatLngBounds();
        validRows.forEach((r) => {
          if (!isNaN(r.lat) && !isNaN(r.lng)) {
            bounds.extend({ lat: r.lat, lng: r.lng });
          }
        });

        console.log("Bounds:", bounds.toJSON());
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds);
        } else {
          console.log("fallback center");
          map.setCenter({ lat: 45, lng: -93 }); // fallback center
          map.setZoom(6);
        }
      });
  };

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.data.setStyle((feature) => {
        const isSelected = feature.getProperty("sdorgid") === selectedId;
        return {
          fillColor: isSelected ? "yellow" : "blue",
          strokeWeight: 1,
          fillOpacity: isSelected ? 0.6 : 0.3,
        };
      });
    }
  }, [selectedId]);

  return (
    <div style={containerStyle}>
      <LoadScript
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          onLoad={onLoad}
          options={{ mapTypeId: "roadmap" }}
        />
      </LoadScript>

      <aside style={asideStyle}>
        <h2>Districts</h2>
        <ul>
          {rows.map((r) => (
            <li
              key={r.id}
              onClick={() => {
                setSelectedId(r.id);
                if (mapRef.current) {
                  // fitBoundsToFeature(mapRef.current, geoJsonFeature);
                  mapRef.current.panTo({ lat: r.lat, lng: r.lng });
                  mapRef.current.setZoom(10); // optional: zoom in
                }
              }}
              style={{
                cursor: "pointer",
                fontWeight: r.id === selectedId ? "bold" : "normal",
                backgroundColor: r.id === selectedId ? "#333" : "transparent",
              }}
            >
              {r.label}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function fitBoundsToFeature(
  map: google.maps.Map,
  geojsonFeature: Feature<Geometry, DistrictProperties>
) {
  const bounds = new google.maps.LatLngBounds();

  const geom = geojsonFeature.geometry;
  if (geom.type === "Polygon") {
    geom.coordinates[0].forEach(([lng, lat]) => bounds.extend({ lat, lng }));
  } else if (geom.type === "MultiPolygon") {
    geom.coordinates.forEach((polygon) => {
      polygon[0].forEach(([lng, lat]) => bounds.extend({ lat, lng }));
    });
  } else {
    console.warn("Unsupported geometry type:", geom.type);
    return;
  }

  map.fitBounds(bounds, 40); // 40px padding
}
