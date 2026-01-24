"use client";

import { GoogleMap } from "@react-google-maps/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getBoundsFromGeoJSON } from "@/app/lib/getBoundsFromGeoJSON";
import { useGoogleMapsStatus } from "@/app/lib/providers/GoogleMapsProvider";
import { ATTENDANCE_OVERLAY_STYLE } from "@/app/components/map/attendance-overlay-style";
import { DEFAULT_BRAND_COLORS } from "@/app/lib/branding/resolveBranding";
import type {
  EntityFeature,
  EntityFeatureCollection,
  EntityMapProperties,
} from "@/domain/map/types";
import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";

type TooltipContent = {
  title: string;
  lines?: string[];
};

type OverlayContext = {
  mapReady: boolean;
  scriptLoaded: boolean;
  loadError: string | null;
};

type OverlayFeatureCollection = FeatureCollection<Geometry, GeoJsonProperties>;

type Props = {
  featureCollection: EntityFeatureCollection;
  selectedId?: string | null;
  onSelect?: (feature: EntityFeature) => void;
  onClearSelection?: () => void;
  isClickable?: (props: EntityMapProperties) => boolean;
  getTooltip?: (props: EntityMapProperties) => TooltipContent | null;
  getOverlayTooltip?: (props: GeoJsonProperties) => TooltipContent | null;
  renderOverlay?: (ctx: OverlayContext) => React.ReactNode;
  overlayFeatureCollection?: OverlayFeatureCollection | null;
  overlayStyle?:
    | google.maps.Data.StylingFunction
    | google.maps.Data.StyleOptions;
  onOverlaySelect?: (feature: google.maps.Data.Feature) => void;
  renderPopup?: (feature: EntityFeature, close: () => void) => React.ReactNode;
  renderSearch?: (
    features: EntityFeature[],
    onSelect: (feature: EntityFeature) => void
  ) => React.ReactNode;
  mapChildren?: React.ReactNode;
  defaultCenter?: google.maps.LatLngLiteral;
  defaultZoom?: number;
  fitBoundsToken?: number | null;
};

const mapContainerStyle = {
  width: "100%",
  height: "90dvh",
};

const MIDWEST_CENTER = { lat: 44.5, lng: -93.5 };
const MIDWEST_ZOOM = 5;
const MINNESOTA_ANCHOR = { lat: 45.3, lng: -94.3 };
const MINNESOTA_ZOOM_OFFSET = 2;
const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;

export default function EntityMapShell({
  featureCollection,
  selectedId,
  onSelect,
  onClearSelection,
  isClickable,
  getTooltip,
  getOverlayTooltip,
  renderOverlay,
  overlayFeatureCollection,
  overlayStyle,
  onOverlaySelect,
  renderPopup,
  renderSearch,
  mapChildren,
  defaultCenter = MIDWEST_CENTER,
  defaultZoom = MIDWEST_ZOOM,
  fitBoundsToken = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlayLayerRef = useRef<google.maps.Data | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const { isLoaded: scriptLoaded, loadError } = useGoogleMapsStatus();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoverRef = useRef<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const hoveredPropsRef = useRef<EntityMapProperties | null>(null);
  const hoveredOverlayPropsRef = useRef<GeoJsonProperties | null>(null);
  const hoveredOverlayFeatureRef = useRef<google.maps.Data.Feature | null>(
    null
  );

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
        // Keep district polygons below the attendance overlay layer so overlay hover/tooltips work.
        zIndex: 1,
        fillColor: isSelected ? "#FFEB3B" : isHovered ? "#FFF176" : "#2196F3",
        fillOpacity: clickable ? 0.5 : 0.2,
        strokeColor: isSelected || isHovered ? "#FBC02D" : "#1976D2",
        strokeWeight: 2,
        cursor: clickable ? "pointer" : "default",
      };
    });
  };

  const isMinnesota = (feature: EntityFeature) => {
    const name = feature.properties?.name?.toLowerCase() ?? "";
    const slug = feature.properties?.slug?.toLowerCase() ?? "";
    return name.includes("minnesota") || slug === "minnesota" || slug === "mn";
  };

  const fitBoundsWithOffset = (
    map: google.maps.Map,
    bounds: google.maps.LatLngBounds,
    options?: {
      zoomOffset?: number;
      center?: google.maps.LatLngLiteral;
    }
  ) => {
    if (bounds.isEmpty()) return;
    map.fitBounds(bounds);
    if (!options?.zoomOffset && !options?.center) return;

    google.maps.event.addListenerOnce(map, "idle", () => {
      const currentZoom = map.getZoom();
      if (options.center) {
        map.panTo(options.center);
      }
      if (typeof currentZoom === "number" && options.zoomOffset) {
        map.setZoom(currentZoom + options.zoomOffset);
      }
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
      const useMinnesotaAnchor = isMinnesota(feature);
      fitBoundsWithOffset(map, bounds, {
        zoomOffset: useMinnesotaAnchor ? MINNESOTA_ZOOM_OFFSET : undefined,
        center: useMinnesotaAnchor ? MINNESOTA_ANCHOR : undefined,
      });
    }
  };

  const getBrandAccentColor = () => {
    if (typeof window === "undefined") return DEFAULT_BRAND_COLORS.accent1;
    const target =
      containerRef.current ?? document.body ?? document.documentElement;
    const value = getComputedStyle(target)
      .getPropertyValue("--brand-accent-1")
      .trim();
    return value || DEFAULT_BRAND_COLORS.accent1;
  };

  const overlayBaseOpacity = ATTENDANCE_OVERLAY_STYLE.fillOpacity ?? 0.25;
  const overlayBaseStrokeWeight = ATTENDANCE_OVERLAY_STYLE.strokeWeight ?? 1;
  const overlayHoverStyle = (brandAccent: string) => ({
    fillColor: brandAccent,
    strokeColor: brandAccent,
    fillOpacity: Math.min(overlayBaseOpacity + 0.15, 0.6),
    strokeWeight: overlayBaseStrokeWeight + 0.5,
  });

  const applyOverlayColors = (
    style: google.maps.Data.StyleOptions,
    brandAccent: string
  ): google.maps.Data.StyleOptions => ({
    ...style,
    fillColor: style.fillColor ?? brandAccent,
    strokeColor: style.strokeColor ?? brandAccent,
  });

  const buildOverlayStyle = (
    baseStyle: google.maps.Data.StylingFunction | google.maps.Data.StyleOptions,
    highlightAll: boolean,
    brandAccent: string
  ): google.maps.Data.StylingFunction | google.maps.Data.StyleOptions => {
    if (typeof baseStyle === "function") {
      return (feature) => {
        const resolved = applyOverlayColors(baseStyle(feature), brandAccent);
        if (!highlightAll) return resolved;
        return {
          ...resolved,
          fillOpacity: Math.min(
            (resolved.fillOpacity ?? overlayBaseOpacity) + 0.1,
            0.6
          ),
          strokeWeight:
            (resolved.strokeWeight ?? overlayBaseStrokeWeight) + 0.5,
        };
      };
    }
    const resolved = applyOverlayColors(baseStyle, brandAccent);
    if (!highlightAll) return resolved;
    return {
      ...resolved,
      fillOpacity: Math.min(
        (resolved.fillOpacity ?? overlayBaseOpacity) + 0.1,
        0.6
      ),
      strokeWeight: (resolved.strokeWeight ?? overlayBaseStrokeWeight) + 0.5,
    };
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
    if (fitBoundsToken === null) return;
    mapRef.current.setCenter(defaultCenter);
    mapRef.current.setZoom(defaultZoom);
  }, [defaultCenter, defaultZoom, fitBoundsToken, mapReady]);

  useEffect(() => {
    if (!mapReady || !overlayLayerRef.current) return;
    const overlayLayer = overlayLayerRef.current;

    // Keep attendance areas in a separate Data layer so district interactions stay intact.
    if (hoveredOverlayFeatureRef.current) {
      overlayLayer.revertStyle(hoveredOverlayFeatureRef.current);
      hoveredOverlayFeatureRef.current = null;
    }
    overlayLayer.forEach((feature) => overlayLayer.remove(feature));
    if (overlayFeatureCollection) {
      overlayLayer.addGeoJson(overlayFeatureCollection);
    } else {
      hoveredOverlayPropsRef.current = null;
      hoverRef.current.visible = false;
      setTooltipTick((tick) => tick + 1);
    }
  }, [mapReady, overlayFeatureCollection]);

  useEffect(() => {
    if (!mapReady || !overlayLayerRef.current) return;
    const overlayLayer = overlayLayerRef.current;
    const baseStyle = overlayStyle ?? ATTENDANCE_OVERLAY_STYLE;
    const highlightAll =
      Boolean(overlayFeatureCollection) &&
      Boolean(selectedId) &&
      Boolean(hoveredId) &&
      hoveredId === selectedId;
    const brandAccent = getBrandAccentColor();

    overlayLayer.setStyle(
      buildOverlayStyle(baseStyle, highlightAll, brandAccent)
    );
  }, [mapReady, overlayStyle, overlayFeatureCollection, hoveredId, selectedId]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    applyStyle(mapRef.current);
  }, [hoveredId, selectedId, mapReady]);

  useEffect(() => {
    if (!mapReady || !overlayLayerRef.current) return;
    const overlayLayer = overlayLayerRef.current;
    const clickListener = overlayLayer.addListener(
      "click",
      (event: google.maps.Data.MouseEvent) => {
        if (event.domEvent) {
          event.domEvent.preventDefault?.();
          event.domEvent.stopPropagation?.();
        }
        onOverlaySelect?.(event.feature);
      }
    );

    return () => {
      clickListener.remove();
    };
  }, [mapReady, onOverlaySelect]);

  useEffect(() => {
    if (!mapReady || !overlayLayerRef.current) return;
    const overlayLayer = overlayLayerRef.current;

    let tooltipFrame: number | null = null;
    let tooltipVisible = false;

    const updateTooltipPosition = () => {
      setTooltipTick((tick) => tick + 1);
    };

    const getOverlayProperties = (
      feature: google.maps.Data.Feature
    ): GeoJsonProperties => {
      const props: Record<string, unknown> = {};
      feature.forEachProperty((value, key) => {
        props[key] = value;
      });
      return props;
    };

    const mouseOver = overlayLayer.addListener(
      "mouseover",
      (event: google.maps.Data.MouseEvent) => {
        if (
          hoveredOverlayFeatureRef.current &&
          hoveredOverlayFeatureRef.current !== event.feature
        ) {
          overlayLayer.revertStyle(hoveredOverlayFeatureRef.current);
        }
        const brandAccent = getBrandAccentColor();
        overlayLayer.overrideStyle(
          event.feature,
          overlayHoverStyle(brandAccent)
        );
        hoveredOverlayFeatureRef.current = event.feature;
        hoveredOverlayPropsRef.current = getOverlayProperties(event.feature);
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
      }
    );

    const mouseOut = overlayLayer.addListener("mouseout", () => {
      if (hoveredOverlayFeatureRef.current) {
        overlayLayer.revertStyle(hoveredOverlayFeatureRef.current);
        hoveredOverlayFeatureRef.current = null;
      }
      hoveredOverlayPropsRef.current = null;
      hoverRef.current.visible = false;
      tooltipVisible = false;
      updateTooltipPosition();
    });

    const mouseMove = overlayLayer.addListener(
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
      if (hoveredOverlayFeatureRef.current) {
        overlayLayer.revertStyle(hoveredOverlayFeatureRef.current);
        hoveredOverlayFeatureRef.current = null;
      }
    };
  }, [mapReady]);

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
  const overlayTooltip =
    hoveredOverlayPropsRef.current && getOverlayTooltip
      ? getOverlayTooltip(hoveredOverlayPropsRef.current)
      : null;
  const baseTooltip =
    hoveredPropsRef.current && getTooltip
      ? getTooltip(hoveredPropsRef.current)
      : null;
  const tooltip =
    overlayTooltip ?? (hoveredOverlayPropsRef.current ? null : baseTooltip);

  const mapCenter = useMemo(() => defaultCenter, [defaultCenter]);
  const mapZoom = useMemo(() => defaultZoom, [defaultZoom]);

  return (
    <div className="relative flex" ref={containerRef}>
      {scriptLoaded ? (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={(map) => {
            mapRef.current = map;
            overlayLayerRef.current = new google.maps.Data({ map });
            setMapReady(true);
          }}
          onUnmount={() => {
            if (overlayLayerRef.current) {
              overlayLayerRef.current.setMap(null);
              overlayLayerRef.current = null;
            }
            mapRef.current = null;
            setMapReady(false);
          }}
          options={{
            mapTypeId: "roadmap",
            ...(GOOGLE_MAP_ID ? { mapId: GOOGLE_MAP_ID } : {}),
            disableDefaultUI: true,
            mapTypeControl: false,
            zoomControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            rotateControl: false,
            scaleControl: false,
          }}
        >
          {mapChildren}
        </GoogleMap>
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
              background: "var(--brand-secondary-1)",
              color: "var(--brand-primary-1)",
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
        <div className="absolute top-4 right-4 w-[min(90vw,360px)] bg-brand-secondary-1 text-brand-primary-1 rounded-lg px-4 py-2 z-50 shadow-lg transition-all duration-150 opacity-100 pointer-events-auto">
          <button
            className="absolute top-1 right-1 text-brand-primary-1 bg-brand-secondary-0 hover:bg-brand-secondary-2 rounded-full px-2 py-0.5 text-xs font-bold z-10"
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
