"use client";
import { GoogleMap, LoadScript } from "@react-google-maps/api";
import { useEffect, useRef, useState } from "react";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import centroid from "@turf/centroid";
import { getBoundsFromGeoJSON } from "../../lib/getBoundsFromGeoJSON";
import { DistrictsPanel, panToMinnesota } from "../districts/district";

interface DistrictProperties {
  sdorgid: string;
  name?: string;
  SDORGNAME?: string;
  SHORTNAME?: string;
}

const mapContainerStyle = { flex: 1 };
const containerStyle = {
  width: "100%",
  height: "100vh",
  display: "flex",
  position: "relative" as const,
};

// ✅ Helper: pan/zoom to a feature (GeoJSON or google.maps.Data.Feature)
function panToFeature(
  feature: Feature<Geometry, DistrictProperties> | google.maps.Data.Feature,
  map: google.maps.Map
) {
  if ("getGeometry" in feature) {
    feature.toGeoJson((geoJsonFeature) => {
      const bounds = getBoundsFromGeoJSON(
        geoJsonFeature as Feature<Geometry, DistrictProperties>
      );
      map.fitBounds(bounds);
    });
  } else {
    const bounds = getBoundsFromGeoJSON(feature);
    map.fitBounds(bounds);
  }
}

export default function MapWithDistricts() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [features, setFeatures] = useState<
    Feature<Geometry, DistrictProperties>[]
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredFeatureProps, setHoveredFeatureProps] =
    useState<DistrictProperties | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [labelMarkers, setLabelMarkers] = useState<google.maps.Marker[]>([]);

  const updateLabelMarkers = (
    map: google.maps.Map,
    features: Feature<Geometry, DistrictProperties>[],
    zoom: number
  ) => {
    labelMarkers.forEach((m) => m.setMap(null));
    const zoomThreshold = 9;
    if (zoom < zoomThreshold) {
      setLabelMarkers([]);
      return;
    }

    const newMarkers: google.maps.Marker[] = features
      .map((feature) => {
        const center = centroid(feature).geometry;
        if (center.type !== "Point") return null;
        const [lng, lat] = center.coordinates;
        return new google.maps.Marker({
          position: { lat, lng },
          map,
          label: {
            text:
              feature.properties.SHORTNAME ??
              feature.properties.name ??
              feature.properties.sdorgid,
            fontSize: "14px",
            color: "black",
            fontWeight: "bold",
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0,
          },
          zIndex: 1000,
        });
      })
      .filter((m): m is google.maps.Marker => m !== null);

    setLabelMarkers(newMarkers);
  };

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;

    fetch("/api/districts")
      .then((res) => res.json())
      .then((geojson: FeatureCollection<Geometry, DistrictProperties>) => {
        map.data.addGeoJson(geojson);
        setFeatures(geojson.features);

        map.data.setStyle((feature) => {
          const id = feature.getProperty("sdorgid");
          const isSelected = id === selectedId;
          const isHovered = id === hoveredId;

          return {
            fillColor: isSelected
              ? "#FFEB3B"
              : isHovered
              ? "#FFF176"
              : "#2196F3",
            fillOpacity: 0.5,
            strokeColor: isSelected || isHovered ? "#FBC02D" : "#1976D2",
            strokeWeight: 2,
          };
        });

        // ✅ Wait for tiles to load before adding zoom listener
        google.maps.event.addListenerOnce(map, "tilesloaded", () => {
          google.maps.event.addListener(map, "zoom_changed", () => {
            const zoom = map.getZoom() ?? 0;
            updateLabelMarkers(map, geojson.features, zoom);
          });

          // Also call once initially
          const zoom = map.getZoom() ?? 0;
          updateLabelMarkers(map, geojson.features, zoom);
        });

        const bounds = new google.maps.LatLngBounds();
        geojson.features.forEach((feature) => {
          const c = centroid(feature);
          const [lng, lat] = c.geometry.coordinates;
          bounds.extend({ lat, lng });
        });
        if (!bounds.isEmpty()) map.fitBounds(bounds);

        map.data.addListener("mouseover", (event) => {
          const id = event.feature.getProperty("sdorgid") as string;
          setHoveredId(id);
          setHoveredFeatureProps({
            sdorgid: id,
            name: event.feature.getProperty("name"),
            SDORGNAME: event.feature.getProperty("SDORGNAME"),
            SHORTNAME: event.feature.getProperty("SHORTNAME"),
          });
        });

        map.data.addListener("mouseout", () => {
          setHoveredId(null);
          setHoveredFeatureProps(null);
        });

        map.data.addListener("click", (event) => {
          const clickedFeature = event.feature;
          const clickedId = clickedFeature.getProperty("sdorgid") as string;
          setSelectedId(clickedId);
          if (mapRef.current) panToFeature(clickedFeature, mapRef.current);
        });
      });
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !features.length) return;

    const selectedFeature = features.find(
      (f) => f.properties?.sdorgid === selectedId
    );
    if (selectedFeature) panToFeature(selectedFeature, map);

    map.data.setStyle((feature) => {
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

      <DistrictsPanel
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        districts={features}
        mapRef={mapRef}
        panToMinnesota={() => {
          if (mapRef.current) {
            panToMinnesota(mapRef.current);
            setLabelMarkers([]);
          }
        }}
      />

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
