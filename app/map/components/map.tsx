"use client";
import { GoogleMap } from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBoundsFromGeoJSON } from "../../lib/getBoundsFromGeoJSON";
import { DistrictsPanel } from "../../ui/districts/district";
import {
  getLabel,
  getLabelPosition,
  panToMinnesota,
} from "../../lib/district/utils";
import React from "react";
import {
  DistrictProperties,
  DistrictWithFoundation,
  LatLngLiteral,
} from "../../lib/types";
import { getSupabaseClient } from "../../../utils/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";

const getSignedImageUrl = async (
  path: string,
  supabase: SupabaseClient
): Promise<string | null> => {
  const parts = path.split("/");
  const filename = parts.pop();
  const folder = parts.join("/");

  // Step 1: Check if file exists
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: files, error: listError } = await supabase.storage
    .from("logos")
    .list(folder, { search: filename });

  const exists = files?.some((f) => f.name === filename);
  if (!exists) return null;

  // Step 2: Generate signed URL
  const { data, error } = await supabase.storage
    .from("logos")
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    console.error("Signed URL error for:", path, error);
    return null;
  }

  return data.signedUrl;
};

const mapContainerStyle = {
  width: "100%",
  height: "80vh",
};
const containerStyle = {
  width: "100%",
  height: "80vh",
  display: "flex",
};

function panToFeature(
  feature: DistrictWithFoundation | google.maps.Data.Feature,
  map: google.maps.Map
) {
  if ("getGeometry" in feature) {
    feature.toGeoJson((geoJsonFeature) => {
      map.fitBounds(
        getBoundsFromGeoJSON(geoJsonFeature as DistrictWithFoundation)
      );
    });
  } else {
    const bounds = getBoundsFromGeoJSON(feature);
    map.fitBounds(bounds);
  }
}

const MapComponent = React.memo(() => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [features, setFeatures] = useState<DistrictWithFoundation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredFeatureProps, setHoveredFeatureProps] =
    useState<DistrictProperties | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(6);
  const center = useMemo<LatLngLiteral>(() => ({ lat: 46.3, lng: -94.2 }), []);
  const supabase = getSupabaseClient();
  const labelMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>(
    []
  );

  // Mobile search state for the compact overlay
  const [query, setQuery] = useState<string>("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as { id: string; label: string }[];
    return features
      .map((f) => {
        const id =
          (f.properties?.sdorgid as string) ??
          (f as unknown as { sdorgid?: string }).sdorgid ??
          "";
        const label =
          getLabel(f) ||
          (f.properties?.shortname as string) ||
          (f.properties?.prefname as string) ||
          "";
        return { id, label };
      })
      .filter((x) => x.id && x.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, features]);

  const updateDistrictInList = useCallback(
    (district: DistrictWithFoundation) => {
      setFeatures((prev) =>
        prev.map((d) =>
          d.sdorgid === district.sdorgid ? { ...d, ...district } : d
        )
      );
    },
    []
  );

  const onUnMount = () => {
    mapRef.current = null;
  };

  async function createLabelMarkers(features: DistrictWithFoundation[]) {
    // Clear existing markers
    labelMarkersRef.current = [];

    const newMarkers = await Promise.all(
      features.map(async (feature) => {
        const markerContent = document.createElement("div");
        const size = Math.max(20, zoomLevel * 5);
        markerContent.style.width = `${size}px`;
        markerContent.style.height = `${size}px`;

        if (feature.metadata?.logo_path) {
          const signedUrl = await getSignedImageUrl(
            feature.metadata.logo_path,
            supabase
          );
          const img = document.createElement("img");
          img.src = signedUrl || "";
          img.alt = "Logo";
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "contain";
          img.onerror = () => {
            img.remove();
            markerContent.textContent = "📍";
          };
          markerContent.appendChild(img);
        } else {
          markerContent.textContent = "📍";
        }

        return new google.maps.marker.AdvancedMarkerElement({
          position: getLabelPosition(feature),
          title: getLabel(feature) || "",
          content: markerContent,
          zIndex: 1000,
        });
      })
    );

    labelMarkersRef.current = newMarkers;
    // newMarkers.forEach((marker) => (marker.map = map));
  }
  const onLoad = async (map: google.maps.Map) => {
    mapRef.current = map;

    await fetch("/api/districts")
      .then((res) => res.json())
      .then((geojson: { features: DistrictWithFoundation[] }) => {
        map.data.addGeoJson(geojson);
        map.data.setStyle({
          visible: true,
          icon: undefined, // ⬅️ disables default pins
        });
        setFeatures(geojson.features);

        map.data.setStyle((feature) => {
          // TODO: Don't think this should come from props. root.prop
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

        // Assuming 'map' is your google.maps.Map object and 'marker' is your google.maps.Marker object
        const minZoomLevel = 7; // Set your desired minimum zoom level for the marker to be visible

        map.addListener("zoom_changed", function () {
          const currentZoom = map.getZoom() ?? 6;
          const size = Math.max(20, currentZoom * 5);

          labelMarkersRef.current.forEach((mark) => {
            const container = mark.content as HTMLDivElement;
            container.style.width = `${size}px`;
            container.style.height = `${size}px`;

            if (currentZoom >= minZoomLevel) {
              mark.map = map;
            } else {
              mark.map = null;
            }
          });
        });

        const bounds = new google.maps.LatLngBounds();
        geojson.features.forEach((feature) => {
          const { centroid_lat, centroid_lng } = feature;
          if (centroid_lat && centroid_lng) {
            bounds.extend({ lat: centroid_lat, lng: centroid_lng });
          }
        });
        if (!bounds.isEmpty()) map.fitBounds(bounds);

        map.data.addListener(
          "mouseover",
          (event: google.maps.Data.MouseEvent) => {
            const id = event.feature.getProperty("sdorgid") as string;
            setHoveredId(id);
            setHoveredFeatureProps({
              sdorgid: id,
              acres: event.feature.getProperty("acres") as string,
              formid: event.feature.getProperty("formid") as string,
              sdtype: event.feature.getProperty("sdtype") as string,
              sqmiles: event.feature.getProperty("sqmiles") as string,
              web_url: event.feature.getProperty("web_url") as string,
              prefname: event.feature.getProperty("prefname") as string,
              sdnumber: event.feature.getProperty("sdnumber") as string,
              shortname: event.feature.getProperty("shortname") as string,
              shape_area: event.feature.getProperty("shape_area") as string,
              shape_leng: event.feature.getProperty("shape_leng") as string,
            });
          }
        );

        map.data.addListener("mouseout", () => {
          setHoveredId(null);
          setHoveredFeatureProps(null);
        });

        // Inside your onLoad function, after map and features are ready:
        // const zoom = map.getZoom() ?? 0;
        createLabelMarkers(geojson.features);
      });
  };
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;

    const selectedFeature = features.find(
      (f) => f.properties?.sdorgid === selectedId
    );

    if (selectedFeature) {
      panToFeature(selectedFeature, mapRef.current);
      // optionally update label styling, etc.
    }
  }, [selectedId, mapRef, features]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !features.length) return;

    function handleClick(event: google.maps.Data.MouseEvent) {
      // Your click handling logic here,
      // using event.feature to access feature data

      const clickedFeature = event.feature;
      const clickedId = clickedFeature.getProperty("sdorgid") as string;

      if (!clickedId) return;

      setSelectedId(clickedId);

      if (mapRef.current) {
        panToFeature(clickedFeature, mapRef.current);
      }
    }

    // const clickEvent = map.data.addListener("click", handleClick);
    map.data.addListener("click", handleClick);

    // updateLabelMarkers(map, features);
    return () => {
      // clickEvent.remove();
      // map.data.removeListener("click", handleClick);
    };
  }, [selectedId, features]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !features.length) return;

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
  }, [hoveredId, selectedId]);

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    console.log("event: ", e);
  };

  return (
    <div
      style={containerStyle}
      className="relative flex flex-col md:flex-row w-full"
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        onLoad={onLoad}
        onClick={onMapClick}
        onUnmount={onUnMount}
        center={center}
        zoom={zoomLevel}
        onZoomChanged={() => setZoomLevel(mapRef.current?.getZoom() ?? 6)}
        options={{
          mapTypeId: "roadmap",
          mapId: "74d818485994559a",
          zoomControl: true,
          disableDefaultUI: false,
        }}
      />
      <div className="hidden md:flex w-[380px] shrink-0">
        <DistrictsPanel
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          districts={features}
          mapRef={mapRef}
          panToMinnesota={() => {
            if (mapRef.current) {
              panToMinnesota(mapRef.current);
            }
          }}
          updateDistrictInList={updateDistrictInList}
        />
      </div>

      {hoveredFeatureProps && (
        <div className="absolute top-24 left-3 bg-black/80 text-white rounded-lg px-4 py-2 pointer-events-none z-50 shadow-lg transition-all duration-150 opacity-100">
          <div className="font-semibold">{hoveredFeatureProps.shortname}</div>
          <div className="text-sm">ID: {hoveredFeatureProps.sdorgid}</div>
          {/* <div>{labelMarkersRef.current}</div> */}
        </div>
      )}

      {/* Mobile search/autocomplete overlay */}
      <div className="absolute bottom-0 w-4/5 p-4 z-50">
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search districts…"
            className="w-full rounded border px-3 py-2 outline-none"
            type="text"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                  Math.min(prev + 1, suggestions.length - 1)
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex((prev) => Math.max(prev - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (
                  highlightedIndex >= 0 &&
                  highlightedIndex < suggestions.length
                ) {
                  const s = suggestions[highlightedIndex];
                  setSelectedId(s.id);
                  const f = features.find(
                    (d) =>
                      (d.properties?.sdorgid as string) === s.id ||
                      ((d as unknown as { sdorgid?: string }).sdorgid ?? "") ===
                        s.id
                  );
                  if (f && mapRef.current) panToFeature(f, mapRef.current);
                  setQuery("");
                  setHighlightedIndex(-1);
                }
              }
            }}
          />
          {query && suggestions.length > 0 && (
            <ul className="mt-2 max-h-60 overflow-y-auto divide-y">
              {suggestions.map((s, i) => (
                <li key={s.id}>
                  <button
                    className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                      i === highlightedIndex ? "bg-gray-200  text-black" : ""
                    }`}
                    onClick={() => {
                      setSelectedId(s.id);
                      const f = features.find(
                        (d) =>
                          (d.properties?.sdorgid as string) === s.id ||
                          ((d as unknown as { sdorgid?: string }).sdorgid ??
                            "") === s.id
                      );
                      if (f && mapRef.current) panToFeature(f, mapRef.current);
                      setQuery("");
                      setHighlightedIndex(-1);
                    }}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="absolute top-12 right-3 bg-black text-white text-sm px-2 py-1 rounded z-50">
        Zoom: {zoomLevel}
        <br />
        Center: {center.lat}
        <br />
        Marker Length: {labelMarkersRef.current.length}
      </div>
    </div>
  );
});

export default MapComponent;
