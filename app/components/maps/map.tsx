"use client";
import { GoogleMap } from "@react-google-maps/api";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getBoundsFromGeoJSON } from "../../lib/getBoundsFromGeoJSON";
import React from "react";
import { DistrictProperties, DistrictFeature } from "../../lib/types/types";
import DistrictPopUp from "@/app/components/districts/district-pop-up";
import DistrictSearch from "@/app/components/districts/district-search";
import LoadingSpinner from "@/app/components/loading-spinner";
// import { pointOnFeature } from "@turf/turf";

const mapContainerStyle = {
  width: "100%",
  height: "90dvh",
};

function panToFeature(
  feature: DistrictFeature | google.maps.Data.Feature,
  map: google.maps.Map
) {
  if ("getGeometry" in feature) {
    feature.toGeoJson((geoJsonFeature) => {
      map.fitBounds(getBoundsFromGeoJSON(geoJsonFeature as DistrictFeature));
    });
  } else {
    const bounds = getBoundsFromGeoJSON(feature);
    map.fitBounds(bounds);
  }
}

const MapComponent = React.memo(() => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [features, setFeatures] = useState<DistrictFeature[]>([]);
  const [selectedFeature, setSelectedFeature] =
    useState<DistrictFeature | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  // Remove hovered state, use refs for tooltip content and id
  const hoveredFeaturePropsRef = useRef<DistrictProperties | null>(null);
  // const [mouseLatLng, setMouseLatLng] =
  //   useState<google.maps.LatLngLiteral | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(6);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  // Remove hoverPosition state; use a ref to track mouse position for the tooltip.
  const hoverRef = useRef<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const hasFitInitialBounds = useRef(false);
  const getMapFeatureId = (feature: google.maps.Data.Feature) =>
    (feature.getProperty("district_id") as string) ||
    (feature.getProperty("sdorgid") as string) ||
    null;
  const getFeatureId = (feature: DistrictFeature) =>
    feature.properties?.district_id ??
    feature.id ??
    feature.properties?.sdorgid ??
    null;
  const applyStyle = (map: google.maps.Map | null, selected?: string) => {
    if (!map) return;
    const selectedVal = selected ?? selectedId;
    map.data.setStyle((feature) => {
      const id = getMapFeatureId(feature);
      const isSelected = id === selectedVal;
      const isHovered = id === hoveredIdRef.current;
      return {
        fillColor: isSelected ? "#FFEB3B" : isHovered ? "#FFF176" : "#2196F3",
        fillOpacity: 0.5,
        strokeColor: isSelected || isHovered ? "#FBC02D" : "#1976D2",
        strokeWeight: 2,
      };
    });
  };
  const labelMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>(
    []
  );
  // if (error) {
  //   console.warn("no user session");
  // }
  // useEffect(() => {
  //   if (user?.role === "admin") {
  //     setIsAdmin(true);
  //   } else {
  //     setIsAdmin(false);
  //   }
  // }, [user]);

  const onUnMount = () => {
    mapRef.current = null;
    setMapReady(false);
  };

  async function createLabelMarkers(
    features: DistrictFeature[],
    map: google.maps.Map
  ) {
    // Clear existing markers
    labelMarkersRef.current.forEach((marker) => (marker.map = null));
    labelMarkersRef.current = [];

    const newMarkers = await Promise.all(
      features.map(async (feature) => {
        const props = feature.properties ?? {};
        if (props.centroid_lat == null || props.centroid_lng == null) {
          return null;
        }
        const markerContent = document.createElement("div");
        const size = Math.max(20, zoomLevel * 5);
        markerContent.style.width = `${size}px`;
        markerContent.style.height = `${size}px`;
        markerContent.style.display = "flex";
        markerContent.style.alignItems = "center";
        markerContent.style.justifyContent = "center";
        markerContent.style.transform = "translate(-50%, -50%)"; // centers the div
        markerContent.style.position = "absolute";
        markerContent.textContent = "📍";

        // 👇 set anchor at center of content
        return new google.maps.marker.AdvancedMarkerElement({
          position: {
            lat: props.centroid_lat as number,
            lng: props.centroid_lng as number,
          },
          title: props.shortname ?? undefined,
          content: markerContent,
          zIndex: 1000,
          map,
        });
      })
    );

    labelMarkersRef.current = newMarkers.filter(
      (m): m is google.maps.marker.AdvancedMarkerElement => Boolean(m)
    );
  }
  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
  };
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/districts");
        if (!res.ok) throw new Error("Failed to load districts");
        const geojson = (await res.json()) as { features: DistrictFeature[] };
        setFeatures(geojson.features ?? []);
      } catch (err) {
        console.error("Failed to load districts for map", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !features.length) return;
    const map = mapRef.current;

    // clear existing data to avoid duplicates
    map.data.forEach((f) => map.data.remove(f));

    map.data.addGeoJson({ type: "FeatureCollection", features });
    applyStyle(map);

    createLabelMarkers(features, map);

    if (!hasFitInitialBounds.current) {
      const bounds = new google.maps.LatLngBounds();
      features.forEach((feature) => {
        const { centroid_lat, centroid_lng } = feature.properties || {};
        if (centroid_lat && centroid_lng) {
          bounds.extend({
            lat: centroid_lat as number,
            lng: centroid_lng as number,
          });
        }
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
        hasFitInitialBounds.current = true;
      }
    }
  }, [features, mapReady]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Tooltip hover logic using refs and animation frame (no React state)
    let tooltipFrame: number | null = null;
    let tooltipVisible = false;

    function updateTooltipPosition() {
      setTooltipTick((tick) => tick + 1);
    }

    const mouseOver = map.data.addListener(
      "mouseover",
      (event: google.maps.Data.MouseEvent) => {
        const id = getMapFeatureId(event.feature);
        hoveredIdRef.current = id;
        hoveredFeaturePropsRef.current = {
          sdorgid: event.feature.getProperty("sdorgid") as string,
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
        applyStyle(map);
      }
    );

    const mouseOut = map.data.addListener("mouseout", () => {
      hoveredIdRef.current = null;
      hoveredFeaturePropsRef.current = null;
      hoverRef.current.visible = false;
      tooltipVisible = false;
      updateTooltipPosition();
      applyStyle(map);
    });

    const mouseMove = map.data.addListener(
      "mousemove",
      (moveEvent: google.maps.Data.MouseEvent) => {
        if (
          moveEvent.domEvent &&
          typeof (moveEvent.domEvent as MouseEvent).clientX === "number" &&
          typeof (moveEvent.domEvent as MouseEvent).clientY === "number"
        ) {
          hoverRef.current.x = (moveEvent.domEvent as MouseEvent).clientX;
          hoverRef.current.y = (moveEvent.domEvent as MouseEvent).clientY;
          hoverRef.current.visible = true;
        }
      }
    );

    return () => {
      mouseOver.remove();
      mouseOut.remove();
      mouseMove.remove();
    };
  }, [selectedId]);

  useEffect(() => {
    if (!mapRef.current || !selectedId) return;

    const findFeature = features.find(
      (f) => getFeatureId(f) === selectedId
    );

    if (findFeature) {
      setSelectedFeature(findFeature);
      panToFeature(findFeature, mapRef.current);
      setShowPopup(true);
    }
  }, [selectedId, mapRef, features]);
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !features.length) return;

    const handleClick = (event: google.maps.Data.MouseEvent) => {
      const clickedFeature = event.feature;
      const clickedId = getMapFeatureId(clickedFeature);

      if (!clickedId) return;

      const found = features.find((f) => getFeatureId(f) === clickedId);
      if (found) {
        setSelectedFeature(found);
        setSelectedId(clickedId);
        setShowPopup(true);
        panToFeature(found, map);
      } else {
        // fallback: pan using the Data.Feature geometry
        panToFeature(clickedFeature, map);
        setSelectedId(clickedId);
        setShowPopup(true);
      }
    };

    const clickListener = map.data.addListener("click", handleClick);

    return () => {
      clickListener.remove();
    };
  }, [features, mapReady]);

  useEffect(() => {
    applyStyle(mapRef.current);
  }, [selectedId, features]);

  // const onMapClick = (e: google.maps.MapMouseEvent) => {
  //   console.log("event: ", e);
  // };

  // const selectedFeature = (id: string): DistrictFeature => {
  //   return features.find((x) => x.id === id);
  // }

  // Tooltip tick state to force rerender of tooltip on mousemove (dummy state)
  const [, setTooltipTick] = useState(0);

  if (loading) return <LoadingSpinner />;
  return (
    <div className="relative flex">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        onLoad={(map) => {
          console.info("Google Map loaded");
          onLoad(map);
        }}
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
          <DistrictPopUp district={selectedFeature} />
        </div>
      )}

      <div className="absolute bottom-0 w-4/5 p-4 z-50">
        <DistrictSearch
          features={features}
          onSelect={(feature) => {
            setShowPopup(true);
            setSelectedFeature(feature);
            setSelectedId(getFeatureId(feature));
            if (mapRef.current) {
              panToFeature(feature, mapRef.current);
            }
          }}
        />
      </div>
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
