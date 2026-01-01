"use client";

import { GoogleMap } from "@react-google-maps/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getBoundsFromGeoJSON } from "@/app/lib/getBoundsFromGeoJSON";
import { useGoogleMapsStatus } from "@/app/lib/providers/GoogleMapsProvider";
import type {
  EntityFeature,
  EntityFeatureCollection,
  EntityMapProperties,
} from "@/app/lib/types/map";

type TooltipContent = {
  title: string;
  lines?: string[];
};

type OverlayContext = {
  mapReady: boolean;
  scriptLoaded: boolean;
  loadError: string | null;
};

type Props = {
  featureCollection: EntityFeatureCollection;
  selectedId?: string | null;
  onSelect?: (feature: EntityFeature) => void;
  onClearSelection?: () => void;
  isClickable?: (props: EntityMapProperties) => boolean;
  getTooltip?: (props: EntityMapProperties) => TooltipContent | null;
  renderOverlay?: (ctx: OverlayContext) => React.ReactNode;
  renderPopup?: (
    feature: EntityFeature,
    close: () => void
  ) => React.ReactNode;
  renderSearch?: (
    features: EntityFeature[],
    onSelect: (feature: EntityFeature) => void
  ) => React.ReactNode;
  defaultCenter?: google.maps.LatLngLiteral;
  defaultZoom?: number;
};

const mapContainerStyle = {
  width: "100%",
  height: "90dvh",
};

const MIDWEST_CENTER = { lat: 44.5, lng: -93.5 };
const MIDWEST_ZOOM = 5;
const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;

export default function EntityMapShell({
  featureCollection,
  selectedId,
  onSelect,
  onClearSelection,
  isClickable,
  getTooltip,
  renderOverlay,
  renderPopup,
  renderSearch,
  defaultCenter = MIDWEST_CENTER,
  defaultZoom = MIDWEST_ZOOM,
}: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const { isLoaded: scriptLoaded, loadError } = useGoogleMapsStatus();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoverRef = useRef<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const hoveredPropsRef = useRef<EntityMapProperties | null>(null);

  const featureById = useMemo(() => {
    const map = new Map<string, EntityFeature>();
    for (const feature of featureCollection.features) {
      const id = String(feature.id ?? feature.properties?.entity_id ?? "");
      if (id) {
        map.set(id, feature);
      }
    }
    return map;
  }, [featureCollection]);

  const selectedFeature = selectedId
    ? featureById.get(selectedId) ?? null
    : null;

  const getMapFeatureId = (feature: google.maps.Data.Feature) =>
    (feature.getId?.() as string) ||
    (feature.getProperty("entity_id") as string) ||
    null;

  const applyStyle = (map: google.maps.Map) => {
    map.data.setStyle((feature) => {
      const id = getMapFeatureId(feature);
      const isSelected = id === selectedId;
      const isHovered = id === hoveredId;
      const geometryType = feature.getGeometry()?.getType();
      const props = {
        entity_id: feature.getProperty("entity_id") as string,
        entity_type: feature.getProperty("entity_type") as string,
        slug: feature.getProperty("slug") as string | null,
        name: feature.getProperty("name") as string | null,
        active: Boolean(feature.getProperty("active")),
        child_count: Number(feature.getProperty("child_count") ?? 0),
      } as EntityMapProperties;
      const clickable = isClickable ? isClickable(props) : true;

      if (geometryType === "Point" || geometryType === "MultiPoint") {
        return {
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isSelected ? 6 : 4,
            fillColor: isSelected ? "#FFEB3B" : "#2196F3",
            fillOpacity: 0.9,
            strokeColor: isHovered ? "#FBC02D" : "#1976D2",
            strokeWeight: 1,
          },
          cursor: clickable ? "pointer" : "default",
        };
      }

      return {
        fillColor: isSelected ? "#FFEB3B" : isHovered ? "#FFF176" : "#2196F3",
        fillOpacity: clickable ? 0.5 : 0.2,
        strokeColor: isSelected || isHovered ? "#FBC02D" : "#1976D2",
        strokeWeight: 2,
        cursor: clickable ? "pointer" : "default",
      };
    });
  };

  const panToFeature = (map: google.maps.Map, feature: EntityFeature) => {
    const geom = feature.geometry;
    if (!geom) return;
    if (geom.type === "Point") {
      const [lng, lat] = geom.coordinates;
      map.panTo({ lat, lng });
      if ((map.getZoom() ?? 0) < 8) {
        map.setZoom(8);
      }
      return;
    }
    const bounds = getBoundsFromGeoJSON(feature);
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds);
    }
  };

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    map.data.forEach((f) => map.data.remove(f));
    map.data.addGeoJson(featureCollection);
    applyStyle(map);
  }, [featureCollection, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    applyStyle(mapRef.current);
  }, [hoveredId, selectedId, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    let tooltipFrame: number | null = null;
    let tooltipVisible = false;

    const updateTooltipPosition = () => {
      setTooltipTick((tick) => tick + 1);
    };

    const mouseOver = map.data.addListener(
      "mouseover",
      (event: google.maps.Data.MouseEvent) => {
        const id = getMapFeatureId(event.feature);
        setHoveredId(id ?? null);
        const feature = id ? featureById.get(id) : null;
        hoveredPropsRef.current = feature?.properties ?? null;
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
      setHoveredId(null);
      hoveredPropsRef.current = null;
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

    const clickListener = map.data.addListener(
      "click",
      (event: google.maps.Data.MouseEvent) => {
        const id = getMapFeatureId(event.feature);
        if (!id) return;
        const feature = featureById.get(id);
        if (!feature) return;
        const clickable = isClickable ? isClickable(feature.properties) : true;
        if (!clickable) return;
        panToFeature(map, feature);
        onSelect?.(feature);
      }
    );

    return () => {
      mouseOver.remove();
      mouseOut.remove();
      mouseMove.remove();
      clickListener.remove();
    };
  }, [featureById, isClickable, mapReady, onSelect]);

  const [, setTooltipTick] = useState(0);
  const tooltip =
    hoveredPropsRef.current && getTooltip
      ? getTooltip(hoveredPropsRef.current)
      : null;

  const mapCenter = useMemo(() => defaultCenter, [defaultCenter]);
  const mapZoom = useMemo(() => defaultZoom, [defaultZoom]);

  return (
    <div className="relative flex">
      {scriptLoaded ? (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={(map) => {
            mapRef.current = map;
            setMapReady(true);
          }}
          onUnmount={() => {
            mapRef.current = null;
            setMapReady(false);
          }}
          options={{
            mapTypeId: "roadmap",
            ...(GOOGLE_MAP_ID ? { mapId: GOOGLE_MAP_ID } : {}),
            zoomControl: true,
            disableDefaultUI: false,
          }}
        />
      ) : (
        <div style={mapContainerStyle} />
      )}

      {renderOverlay?.({ mapReady, scriptLoaded, loadError })}

      {renderSearch && (
        <div className="absolute bottom-0 w-4/5 p-4 z-50">
          {renderSearch(featureCollection.features, (feature) => {
            onSelect?.(feature);
            if (mapRef.current) {
              panToFeature(mapRef.current, feature);
            }
          })}
        </div>
      )}

      {typeof window !== "undefined" &&
        tooltip &&
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
            <div className="font-semibold">{tooltip.title}</div>
            {tooltip.lines?.length ? (
              <div className="text-sm space-y-1">
                {tooltip.lines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            ) : null}
          </div>,
          document.body
        )}

      {selectedFeature && renderPopup && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 md:left-3 md:transform-none md:-translate-x-0 bg-black/80 text-white rounded-lg px-4 py-2 z-50 shadow-lg transition-all duration-150 opacity-100 pointer-events-auto">
          <button
            className="absolute top-1 right-1 text-white bg-gray-700 hover:bg-gray-900 rounded-full px-2 py-0.5 text-xs font-bold z-10"
            style={{ lineHeight: "1" }}
            onClick={() => onClearSelection?.()}
            aria-label="Close popup"
            type="button"
          >
            X
          </button>
          {renderPopup(selectedFeature, () => onClearSelection?.())}
        </div>
      )}
    </div>
  );
}
