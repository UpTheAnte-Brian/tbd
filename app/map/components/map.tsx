"use client";
import { GoogleMap } from "@react-google-maps/api";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getBoundsFromGeoJSON } from "../../lib/getBoundsFromGeoJSON";
import React from "react";
import { DistrictProperties, DistrictWithFoundation } from "../../lib/types";
import { getSupabaseClient } from "../../../utils/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import DistrictPopUp from "@/app/components/districts/district-pop-up";
import DistrictSearch from "@/app/components/districts/district-search";
import { useUser } from "@/app/hooks/useUser";
import LoadingSpinner from "@/app/components/loading-spinner";
// import { pointOnFeature } from "@turf/turf";

const getPublicImageUrl = (
  path: string,
  supabase: SupabaseClient
): string | null => {
  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  return data?.publicUrl ?? null;
};

const mapContainerStyle = {
  width: "100%",
  height: "90dvh",
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
  // const [mouseLatLng, setMouseLatLng] =
  //   useState<google.maps.LatLngLiteral | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(6);
  const [showPopup, setShowPopup] = useState<boolean>(true);
  // Remove hoverPosition state; use a ref to track mouse position for the tooltip.
  const hoverRef = useRef<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  // const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const { user, loading, error } = useUser();
  const supabase = getSupabaseClient();
  const labelMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>(
    []
  );
  if (error) {
    console.warn("no user session");
  }
  // useEffect(() => {
  //   if (user?.role === "admin") {
  //     setIsAdmin(true);
  //   } else {
  //     setIsAdmin(false);
  //   }
  // }, [user]);

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

  const onUnMount = () => {
    mapRef.current = null;
  };

  async function createLabelMarkers(
    features: DistrictWithFoundation[],
    map: google.maps.Map
  ) {
    // Clear existing markers
    labelMarkersRef.current.forEach((marker) => (marker.map = null));
    labelMarkersRef.current = [];

    const newMarkers = await Promise.all(
      features.map(async (feature) => {
        const markerContent = document.createElement("div");
        const size = Math.max(20, zoomLevel * 5);
        markerContent.style.width = `${size}px`;
        markerContent.style.height = `${size}px`;
        markerContent.style.display = "flex";
        markerContent.style.alignItems = "center";
        markerContent.style.justifyContent = "center";
        markerContent.style.transform = "translate(-50%, -50%)"; // centers the div
        markerContent.style.position = "absolute";

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

        // 👇 set anchor at center of content
        return new google.maps.marker.AdvancedMarkerElement({
          position: {
            lat: feature.centroid_lat!,
            lng: feature.centroid_lng!,
          },
          title: feature.shortname,
          content: markerContent,
          zIndex: 1000,
          map,
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
        await createLabelMarkers(geojson.features, map);

        // Marker visibility on zoom (always show markers)
        // map.addListener("zoom_changed", function () {
        //   const currentZoom = map.getZoom() ?? 6;
        //   const size = Math.max(20, currentZoom * 5);
        //   labelMarkersRef.current.forEach((mark) => {
        //     const container = mark.content as HTMLDivElement;
        //     container.style.width = `${size}px`;
        //     container.style.height = `${size}px`;
        //     mark.map = map;
        //   });
        // });

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
        // map.addListener("mousemove", (e: google.maps.MapMouseEvent) => {
        //   if (e.latLng) {
        //     setMouseLatLng(e.latLng.toJSON());
        //   }
        // });
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

  // const onMapClick = (e: google.maps.MapMouseEvent) => {
  //   console.log("event: ", e);
  // };

  // const selectedFeature = (id: string): DistrictWithFoundation => {
  //   return features.find((x) => x.id === id);
  // }

  // Tooltip tick state to force rerender of tooltip on mousemove (dummy state)
  const [, setTooltipTick] = useState(0);

  if (loading) return <LoadingSpinner />;
  return (
    <div className="relative flex">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        onLoad={onLoad}
        // onClick={onMapClick}
        onUnmount={onUnMount}
        // center={center}
        // zoom={zoomLevel}
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
            user={user}
            onLogoUpload={handleLogoUpload}
          />
        </div>
      )}

      <DistrictSearch
        features={features}
        onSelect={(feature) => {
          setShowPopup(true);
          setSelectedId(feature.properties?.sdorgid ?? null);
          if (mapRef.current) {
            panToFeature(feature, mapRef.current);
          }
        }}
      />
      {/* {mouseLatLng && isAdmin && (
        <div className="absolute top-3 left-3 bg-black text-white text-xs px-2 py-1 rounded z-50">
          Lat: {mouseLatLng.lat.toFixed(5)}, Lng: {mouseLatLng.lng.toFixed(5)}
        </div>
      )} */}
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
