"use client";
import { GoogleMap, LoadScript } from "@react-google-maps/api";
import { useEffect, useRef, useState } from "react";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import centroid from "@turf/centroid";
import { getBoundsFromGeoJSON } from "../../lib/getBoundsFromGeoJSON";

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
const containerStyle = {
  width: "100%",
  height: "100vh",
  display: "flex",
  position: "relative" as const,
};

export default function MapWithDistricts() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [features, setFeatures] = useState<
    Feature<Geometry, DistrictProperties>[]
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredFeatureProps, setHoveredFeatureProps] =
    useState<DistrictProperties | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;

    fetch("/api/districts")
      .then((res) => res.json())
      .then((geojson: FeatureCollection<Geometry, DistrictProperties>) => {
        map.data.addGeoJson(geojson);
        setFeatures(geojson.features);

        const validRows: Row[] = geojson.features.map((f) => {
          const c = centroid(f);
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
        });

        setRows(validRows);

        const bounds = new google.maps.LatLngBounds();
        validRows.forEach((r) => bounds.extend({ lat: r.lat, lng: r.lng }));
        if (!bounds.isEmpty()) map.fitBounds(bounds);

        map.data.setStyle((feature) => {
          const id = feature.getProperty("sdorgid");
          const isSelected = id === selectedId;
          const isHovered = id === hoveredId;

          return {
            fillColor: isSelected
              ? "#FFEB3B" // selected yellow
              : isHovered
              ? "#FFF176" // lighter yellow on hover
              : "#2196F3", // default blue
            fillOpacity: 0.5,
            strokeColor: isSelected || isHovered ? "#FBC02D" : "#1976D2",
            strokeWeight: 2,
          };
        });
        map.data.addListener(
          "mouseover",
          (event: google.maps.Data.MouseEvent) => {
            const id = event.feature.getProperty("sdorgid") as string;
            setHoveredId(id);
            setHoveredFeatureProps({
              sdorgid: event.feature.getProperty("sdorgid") as string,
              name: event.feature.getProperty("name") as string | undefined,
              SDORGNAME: event.feature.getProperty("SDORGNAME") as
                | string
                | undefined,
              SHORTNAME: event.feature.getProperty("SHORTNAME") as
                | string
                | undefined,
            });
          }
        );

        map.data.addListener("mouseout", () => {
          setHoveredId(null);
          setHoveredFeatureProps(null);
        });

        map.data.addListener("click", (event: google.maps.Data.MouseEvent) => {
          const clickedFeature = event.feature;
          const clickedId = clickedFeature.getProperty("sdorgid") as string;
          setSelectedId(clickedId);

          clickedFeature.toGeoJson((geoJsonFeature) => {
            if (mapRef.current) {
              const bounds = getBoundsFromGeoJSON(
                geoJsonFeature as Feature<Geometry, DistrictProperties>
              );
              map.fitBounds(bounds);
            }
          });
        });
      });
  };

  useEffect(() => {
    if (!mapRef.current || !features.length) return;

    mapRef.current.data.setStyle((feature) => {
      const id = feature.getProperty("sdorgid");
      const isSelected = id === selectedId;
      const isHovered = id === hoveredId;

      return {
        fillColor: isSelected ? "#FFEB3B" : isHovered ? "#FFF176" : "#2196F3",
        fillOpacity: 0.5,
        strokeColor: isSelected || isHovered ? "#FBC02D" : "#1976D2",
        strokeWeight: 2,
      };
    });
  }, [selectedId, hoveredId, features]);

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
        <div className="font-bold bg-gray-500">Districts</div>
        <ul>
          {rows.map((r) => (
            <li
              key={r.id}
              onClick={() => {
                setSelectedId(r.id);
                if (mapRef.current) {
                  const feature = features.find(
                    (f) => f.properties.sdorgid === r.id
                  );
                  if (feature) {
                    const bounds = getBoundsFromGeoJSON(feature);
                    mapRef.current.fitBounds(bounds);
                    mapRef.current.panTo({ lat: r.lat, lng: r.lng });
                    mapRef.current.setZoom(10); // optional: zoom in
                  }
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
      {hoveredFeatureProps && (
        <div className="absolute top-14 left-3 bg-black/80 text-white rounded-lg px-4 py-2 pointer-events-none z-50 shadow-lg transition-all duration-150 opacity-100">
          <div className="font-semibold">
            {hoveredFeatureProps.SHORTNAME || hoveredFeatureProps.SDORGNAME}
          </div>
          <div className="text-sm">ID: {hoveredFeatureProps.sdorgid}</div>
        </div>
      )}
    </div>
  );
}

// const addLabelsToMap = (
//   features: Feature<Geometry, DistrictProperties>[],
//   selectedId?: string
// ) => {
//   labelMarkers.forEach((m) => m.setMap(null));
// const map = mapRef.current;
//   if (!map) return;
//   const newMarkers: google.maps.Marker[] = features
//     .map((f) => {
//       const center = centroid(f).geometry;
//       if (center.type !== "Point") return null;

//       const [lng, lat] = center.coordinates;

//       return new google.maps.Marker({
//         position: { lat, lng },
//         map,
//         label: {
//           text: f.properties.SHORTNAME ?? f.properties.name ?? "",
//           color: f.properties.sdorgid === selectedId ? "yellow" : "white",
//           fontWeight: f.properties.sdorgid === selectedId ? "bold" : "normal",
//           fontSize: "14px",
//         },
//         icon: {
//           path: google.maps.SymbolPath.CIRCLE,
//           scale: 0,
//         },
//         zIndex: f.properties.sdorgid === selectedId ? 1000 : 1,
//       });
//     })
//     .filter((m): m is google.maps.Marker => m !== null);

//   setLabelMarkers(newMarkers);
// };
