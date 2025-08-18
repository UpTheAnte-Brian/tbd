"use client";
import { GoogleMap } from "@react-google-maps/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getBoundsFromGeoJSON } from "../../lib/getBoundsFromGeoJSON";
import { getLabel, getLabelPosition } from "../../lib/district/utils";
import React from "react";
import {
  DistrictProperties,
  DistrictWithFoundation,
  LatLngLiteral,
} from "../../lib/types";
import { getSupabaseClient } from "../../../utils/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import DistrictPopUp from "@/app/ui/districts/district-pop-up";

const getPublicImageUrl = (
  path: string,
  supabase: SupabaseClient
): string | null => {
  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  return data?.publicUrl ?? null;
};

const mapContainerStyle = {
  width: "100%",
  height: "80vh",
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
  const [selectedFeature, setSelectedFeature] =
    useState<DistrictWithFoundation | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Remove hovered state, use refs for tooltip content and id
  const hoveredFeaturePropsRef = useRef<DistrictProperties | null>(null);
  const [mouseLatLng, setMouseLatLng] =
    useState<google.maps.LatLngLiteral | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(6);
  const [showPopup, setShowPopup] = useState<boolean>(true);
  // Remove hoverPosition state; use a ref to track mouse position for the tooltip.
  const hoverRef = useRef<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const center = useMemo<LatLngLiteral>(() => ({ lat: 46.3, lng: -94.2 }), []);
  const supabase = getSupabaseClient();
  const labelMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>(
    []
  );
  // Fetch isAdmin from Supabase on mount
  useEffect(() => {
    const fetchIsAdmin = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setIsAdmin(false);
          return;
        }
        // Assuming you have a user profile table or claims
        // We'll check for a custom claim or role
        // Example: user.user_metadata.role === 'admin'
        // Or fetch from a profile table
        // Try both, fallback to false
        if (user.user_metadata && user.user_metadata.role === "admin") {
          setIsAdmin(true);
          return;
        }
        // Try a profile table (adjust as needed)
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (!error && profile?.role === "admin") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.log("Admin Check Error: ", err);
        setIsAdmin(false);
      }
    };
    fetchIsAdmin();
  }, []);

  // handleLogoUpload implementation
  const handleLogoUpload = async (file: File, sdorgid: string) => {
    if (!file || !sdorgid) return;
    // Get extension
    const ext = file.name.split(".").pop();
    const path = `district-logos/${sdorgid}/logo.${ext}`;
    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      console.error("Logo upload error:", uploadError);
      return;
    }
    // Upsert district_metadata with logo_path
    const { error: upsertError } = await supabase
      .from("district_metadata")
      .upsert({ sdorgid, logo_path: path }, { onConflict: "sdorgid" });
    if (upsertError) {
      console.error("Metadata upsert error:", upsertError);
      return;
    }
    // Update features state with new logo_path for the affected district
    setFeatures((prev) =>
      prev.map((d) =>
        (d.sdorgid ?? d.properties?.sdorgid) === sdorgid
          ? {
              ...d,
              metadata: {
                ...(d.metadata || {}),
                logo_path: path,
              },
            }
          : d
      )
    );
  };

  // const updateDistrictInList = useCallback(
  //   (district: DistrictWithFoundation) => {
  //     setFeatures((prev) =>
  //       prev.map((d) =>
  //         d.sdorgid === district.sdorgid ? { ...d, ...district } : d
  //       )
  //     );
  //   },
  //   []
  // );

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

  // const updateDistrictInList = useCallback(
  //   (district: DistrictWithFoundation) => {
  //     setFeatures((prev) =>
  //       prev.map((d) =>
  //         d.sdorgid === district.sdorgid ? { ...d, ...district } : d
  //       )
  //     );
  //   },
  //   []
  // );

  const onUnMount = () => {
    mapRef.current = null;
  };

  async function createLabelMarkers(features: DistrictWithFoundation[]) {
    // Only create once, clear any existing
    labelMarkersRef.current.forEach((marker) => (marker.map = null));
    labelMarkersRef.current = [];

    const newMarkers = await Promise.all(
      features.map(async (feature) => {
        const markerContent = document.createElement("div");
        const size = Math.max(20, zoomLevel * 5);
        markerContent.style.width = `${size}px`;
        markerContent.style.height = `${size}px`;

        if (feature.metadata?.logo_path) {
          const publicUrl = getPublicImageUrl(
            feature.metadata.logo_path,
            supabase
          );
          const img = document.createElement("img");
          img.src = publicUrl || "";
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
  }
  const onLoad = async (map: google.maps.Map) => {
    mapRef.current = map;

    await fetch("/api/districts")
      .then((res) => res.json())
      .then(async (geojson: { features: DistrictWithFoundation[] }) => {
        map.data.addGeoJson(geojson);
        map.data.setStyle({
          visible: true,
          icon: undefined,
        });
        setFeatures(geojson.features);

        // Markers: create and attach once
        await createLabelMarkers(geojson.features);

        // Marker visibility on zoom
        const minZoomLevel = 7;
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

        // Fit map to bounds
        const bounds = new google.maps.LatLngBounds();
        geojson.features.forEach((feature) => {
          const { centroid_lat, centroid_lng } = feature;
          if (centroid_lat && centroid_lng) {
            bounds.extend({ lat: centroid_lat, lng: centroid_lng });
          }
        });
        if (!bounds.isEmpty()) map.fitBounds(bounds);

        // Tooltip hover logic using refs and animation frame (no React state)
        let tooltipFrame: number | null = null;
        let tooltipVisible = false;

        function updateTooltipPosition() {
          // This function triggers a rerender of the tooltip by updating a dummy state
          setTooltipTick((tick) => tick + 1);
        }

        map.data.addListener(
          "mouseover",
          (event: google.maps.Data.MouseEvent) => {
            const id = event.feature.getProperty("sdorgid") as string;
            hoveredIdRef.current = id;
            hoveredFeaturePropsRef.current = {
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
            };
            if (
              event.domEvent &&
              typeof (event.domEvent as MouseEvent).clientX === "number" &&
              typeof (event.domEvent as MouseEvent).clientY === "number"
            ) {
              hoverRef.current.x = (event.domEvent as MouseEvent).clientX;
              hoverRef.current.y = (event.domEvent as MouseEvent).clientY;
              hoverRef.current.visible = true;
              tooltipVisible = true;
              if (tooltipFrame === null) {
                tooltipFrame = requestAnimationFrame(function tick() {
                  if (tooltipVisible) {
                    updateTooltipPosition();
                    tooltipFrame = requestAnimationFrame(tick);
                  } else {
                    tooltipFrame = null;
                  }
                });
              }
            }
            // Mousemove to update tooltip position
            map.data.addListener(
              "mousemove",
              (moveEvent: google.maps.Data.MouseEvent) => {
                if (
                  moveEvent.domEvent &&
                  typeof (moveEvent.domEvent as MouseEvent).clientX ===
                    "number" &&
                  typeof (moveEvent.domEvent as MouseEvent).clientY === "number"
                ) {
                  hoverRef.current.x = (
                    moveEvent.domEvent as MouseEvent
                  ).clientX;
                  hoverRef.current.y = (
                    moveEvent.domEvent as MouseEvent
                  ).clientY;
                  hoverRef.current.visible = true;
                }
              }
            );
          }
        );

        map.data.addListener("mouseout", () => {
          hoveredIdRef.current = null;
          hoveredFeaturePropsRef.current = null;
          hoverRef.current.visible = false;
          tooltipVisible = false;
          updateTooltipPosition();
        });
        map.addListener("mousemove", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            setMouseLatLng(e.latLng.toJSON());
          }
        });
      });
  };
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;

    const findFeature = features.find(
      (f) => f.properties?.sdorgid === selectedId
    );

    if (findFeature) {
      setSelectedFeature(findFeature);
      panToFeature(findFeature, mapRef.current);
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
      setShowPopup(true);

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
      // Use hoveredIdRef directly (not state)
      const isHovered = id === hoveredIdRef.current;
      return {
        fillColor: isSelected ? "#FFEB3B" : isHovered ? "#FFF176" : "#2196F3",
        fillOpacity: 0.5,
        strokeColor: isSelected || isHovered ? "#FBC02D" : "#1976D2",
        strokeWeight: 2,
      };
    });
  }, [selectedId, features]);

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    console.log("event: ", e);
  };

  // const selectedFeature = (id: string): DistrictWithFoundation => {
  //   return features.find((x) => x.id === id);
  // }

  // Tooltip tick state to force rerender of tooltip on mousemove (dummy state)
  const [, setTooltipTick] = useState(0);

  return (
    <div className="relative flex flex-col md:flex-row w-full">
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
      {/* <div className="hidden md:flex w-[380px] shrink-0">
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
      </div> */}

      {/* Hovered tooltip rendered via portal, using refs and fixed positioning */}
      {typeof window !== "undefined" &&
        hoveredFeaturePropsRef.current &&
        hoverRef.current.visible &&
        createPortal(
          <div
            className="hidden md:block"
            style={{
              position: "fixed",
              left: hoverRef.current.x + 10,
              top: hoverRef.current.y - 40,
              background: "rgba(0,0,0,0.8)",
              color: "white",
              borderRadius: "0.5rem",
              padding: "0.5rem 1rem",
              pointerEvents: "none",
              zIndex: 50,
              boxShadow: "0 4px 16px rgba(0,0,0,0.14)",
              opacity: 1,
              transition: "all 150ms",
            }}
          >
            <div className="font-semibold">
              {hoveredFeaturePropsRef.current.shortname}
            </div>
            <div className="text-sm">
              ID: {hoveredFeaturePropsRef.current.sdorgid}
            </div>
          </div>,
          document.body
        )}

      {selectedFeature && showPopup && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 md:left-3 md:transform-none md:-translate-x-0 bg-black/80 text-white rounded-lg px-4 py-2 z-50 shadow-lg transition-all duration-150 opacity-100 pointer-events-auto">
          <button
            className="absolute top-1 right-1 text-white bg-gray-700 hover:bg-gray-900 rounded-full px-2 py-0.5 text-xs font-bold z-10"
            style={{ lineHeight: "1" }}
            onClick={() => setShowPopup(false)}
            aria-label="Close popup"
            type="button"
          >
            X
          </button>
          <DistrictPopUp
            district={selectedFeature}
            isAdmin={isAdmin}
            onLogoUpload={handleLogoUpload}
          />
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
                    className={`w-full text-left px-3 py-2 hover:bg-gray-100 hover:text-black ${
                      i === highlightedIndex
                        ? "bg-gray-200  hover:text-black"
                        : ""
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
      {mouseLatLng && isAdmin && (
        <div className="absolute top-3 left-3 bg-black text-white text-xs px-2 py-1 rounded z-50">
          Lat: {mouseLatLng.lat.toFixed(5)}, Lng: {mouseLatLng.lng.toFixed(5)}
        </div>
      )}
      {/* <div className="absolute top-12 right-3 bg-black text-white text-sm px-2 py-1 rounded z-50">
        Zoom: {zoomLevel}
        <br />
        Center: {center.lat}
        <br />
        Marker Length: {labelMarkersRef.current.length}
      </div> */}
    </div>
  );
});

export default MapComponent;
