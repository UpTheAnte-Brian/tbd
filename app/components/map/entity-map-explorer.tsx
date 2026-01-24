/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { CircleF, InfoWindowF } from "@react-google-maps/api";
import { useEffect, useMemo, useRef, useState } from "react";
import EntityMapShell from "@/app/components/map/entity-map-shell";
import DistrictSearch from "@/app/components/districts/district-search";
import DistrictPopUp from "@/app/components/districts/district-pop-up";
import LoadingSpinner from "@/app/components/loading-spinner";
import LayerLegend from "@/app/components/map/LayerLegend";
import { DEFAULT_BRAND_COLORS } from "@/app/lib/branding/resolveBranding";
import {
  fetchMapGeometryDetail,
  type EntityGeometryRow,
  type EntityGeometriesByType,
} from "@/app/lib/geo/entity-geometries";
import { GEOMETRY_LAYERS } from "@/app/lib/map/layers";
import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type {
  EntityFeature,
  EntityFeatureCollection,
  EntityMapProperties,
} from "@/domain/map/types";

type Layer = "states" | "districts";

type Props = {
  initialStates: EntityFeatureCollection;
  homeStatus?: {
    loading: boolean;
    error?: string | null;
    featureCount: number;
  };
};

type ChildrenResponse = {
  parent_entity_id: string;
  relationship: string;
  entity_type: string;
  geometry_type: string;
  returned_count: number;
  featureCollection: EntityFeatureCollection;
};

type OverlayFeatureCollection = FeatureCollection<Geometry, GeoJsonProperties>;

type SchoolPoint = {
  id: string;
  position: google.maps.LatLngLiteral;
  properties: GeoJsonProperties;
};

type DetailCacheEntry = {
  geometryType: string;
  featureCollection: OverlayFeatureCollection;
  geometryRows: EntityGeometryRow[];
  returnedCount: number;
};

type DetailRequest = {
  geometryType: string;
  endpoint: "attendance-areas" | "school-program-locations";
  setFeatureCollection: (collection: OverlayFeatureCollection | null) => void;
  setLoading: (loading: boolean) => void;
  setReturnedCount?: (count: number | null) => void;
};

const STATES_CACHE_KEY = "states:us";
const GEOMETRY_FETCH_DELAY_MS = 150;
const ATTENDANCE_GEOMETRY_TYPE = "district_attendance_areas";
const SCHOOL_GEOMETRY_TYPE = "school_program_locations";

const detailCacheKey = (entityId: string, geometryType: string) =>
  `${entityId}:${geometryType}`;

const mergeGeometries = (
  base: EntityGeometriesByType,
  next: EntityGeometriesByType
) => {
  const merged: EntityGeometriesByType = { ...base };
  Object.entries(next).forEach(([geometryType, rows]) => {
    const existing = merged[geometryType] ?? [];
    const existingIds = new Set(existing.map((row) => row.id));
    merged[geometryType] = [
      ...existing,
      ...rows.filter((row) => !existingIds.has(row.id)),
    ];
  });
  return merged;
};

const splitNameList = (value: string) =>
  value
    .split(/[|,;]\s*/)
    .map((name) => name.trim())
    .filter(Boolean);

const normalizeNameList = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === "string") return splitNameList(value);
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeNameList(item));
  }
  return [];
};

type SchoolInfo = {
  title: string;
  lines: string[];
};

const coerceDisplayValue = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }
  return null;
};

const buildSchoolInfo = (props: GeoJsonProperties): SchoolInfo => {
  const record = (props ?? {}) as Record<string, unknown>;
  const rawTitle =
    coerceDisplayValue(record.entity_name) ??
    coerceDisplayValue(record.gisname) ??
    coerceDisplayValue(record.mdename) ??
    coerceDisplayValue(record.name) ??
    coerceDisplayValue(record.altname) ??
    coerceDisplayValue(record.entity_slug) ??
    "School";
  const title = rawTitle === "School" ? rawTitle : `School: ${rawTitle}`;
  const orgId = coerceDisplayValue(record.orgid);
  const typeValue =
    coerceDisplayValue(record.pubpriv) ??
    coerceDisplayValue(record.orgtype) ??
    coerceDisplayValue(record.org_type);
  const gradeRange = coerceDisplayValue(record.graderange);
  const lines = [
    orgId ? `Org ID: ${orgId}` : null,
    typeValue ? `Type: ${typeValue}` : null,
    gradeRange ? `Grades: ${gradeRange}` : null,
  ].filter((line): line is string => Boolean(line));

  return { title, lines };
};

export default function EntityMapExplorer({
  initialStates,
  homeStatus,
}: Props) {
  const [activeLayer, setActiveLayer] = useState<Layer>("states");
  const [featureCollection, setFeatureCollection] =
    useState<EntityFeatureCollection>(initialStates);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<EntityFeature | null>(
    null
  );
  const [loadingChildLayer, setLoadingChildLayer] = useState(false);
  const [selectedState, setSelectedState] =
    useState<EntityMapProperties | null>(null);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [selectedDistrictEntityId, setSelectedDistrictEntityId] = useState<
    string | null
  >(null);
  const [detailGeometriesByType, setDetailGeometriesByType] =
    useState<EntityGeometriesByType>({});
  const [attendanceFeatureCollection, setAttendanceFeatureCollection] =
    useState<OverlayFeatureCollection | null>(null);
  const [loadingAttendanceAreas, setLoadingAttendanceAreas] =
    useState(false);
  const [schoolsVisible, setSchoolsVisible] = useState(true);
  const [schoolFeatureCollection, setSchoolFeatureCollection] =
    useState<OverlayFeatureCollection | null>(null);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [schoolsScanned, setSchoolsScanned] = useState<number | null>(null);
  const [hoveredSchoolId, setHoveredSchoolId] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [fitBoundsToken, setFitBoundsToken] = useState<number | null>(null);

  const cacheRef = useRef(new Map<string, EntityFeatureCollection>());
  const detailGeometryCacheRef = useRef(new Map<string, DetailCacheEntry>());
  const detailGeometryAbortRef = useRef<AbortController | null>(null);
  const detailGeometryDebounceRef = useRef<number | null>(null);
  const geometriesByType = useMemo(
    () => detailGeometriesByType,
    [detailGeometriesByType]
  );
  if (!cacheRef.current.has(STATES_CACHE_KEY)) {
    cacheRef.current.set(STATES_CACHE_KEY, initialStates);
  }

  useEffect(() => {
    if (initialStates.features.length > 0) return;
    let cancelled = false;

    async function loadStates() {
      try {
        const res = await fetch("/api/map/home", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load states map");
        }
        const data = (await res.json()) as {
          featureCollection?: EntityFeatureCollection;
        };
        if (cancelled) return;
        const nextCollection = data.featureCollection ?? {
          type: "FeatureCollection",
          features: [],
        };
        cacheRef.current.set(STATES_CACHE_KEY, nextCollection);
        setFeatureCollection(nextCollection);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
        }
      }
    }

    void loadStates();

    return () => {
      cancelled = true;
    };
  }, [initialStates]);

  const isMinnesota = (props: EntityMapProperties) => {
    const name = props.name?.toLowerCase() ?? "";
    const slug = props.slug?.toLowerCase() ?? "";
    return name.includes("minnesota") || slug === "minnesota" || slug === "mn";
  };

  const isClickable = (props: EntityMapProperties) =>
    props.active === true &&
    props.entity_type === "state" &&
    isMinnesota(props);

  const handleSelect = async (feature: EntityFeature) => {
    setSelectedId(feature.id as string);
    setSelectedFeature(feature);

    if (activeLayer === "districts") {
      setSelectedDistrictEntityId(feature.properties.entity_id);
      return;
    }

    if (!isClickable(feature.properties)) {
      return;
    }

    const parentId = feature.properties.entity_id;
    setSelectedState(feature.properties);

    const cacheKey = `districts:${parentId}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setFeatureCollection(cached);
      setActiveLayer("districts");
      setSelectedId(null);
      setSelectedFeature(null);
      setSelectedDistrictEntityId(null);
      setDetailGeometriesByType({});
      setAttendanceFeatureCollection(null);
      setSchoolFeatureCollection(null);
      setLoadingAttendanceAreas(false);
      setLoadingSchools(false);
      setSchoolsScanned(null);
      setEmptyMessage(cached.features.length ? null : "Coming soon.");
      return;
    }

    setLoadingChildLayer(true);
    setEmptyMessage(null);
    try {
      const res = await fetch(
        `/api/map/entities/${parentId}/children?relationship=contains&entity_type=district&geometry_type=boundary&limit=400`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        throw new Error("Failed to load child layer");
      }
      const data = (await res.json()) as ChildrenResponse;
      cacheRef.current.set(cacheKey, data.featureCollection);
      setFeatureCollection(data.featureCollection);
      setActiveLayer("districts");
      setSelectedId(null);
      setSelectedFeature(null);
      setSelectedDistrictEntityId(null);
      setDetailGeometriesByType({});
      setAttendanceFeatureCollection(null);
      setSchoolFeatureCollection(null);
      setLoadingAttendanceAreas(false);
      setLoadingSchools(false);
      setSchoolsScanned(null);
      setEmptyMessage(
        data.featureCollection.features.length ? null : "Coming soon."
      );
    } catch (err) {
      console.error(err);
      setEmptyMessage("Unable to load districts for this state.");
      setActiveLayer("districts");
    } finally {
      setLoadingChildLayer(false);
    }
  };

  const handleBack = () => {
    const cachedStates =
      cacheRef.current.get(STATES_CACHE_KEY) ?? initialStates;
    setFeatureCollection(cachedStates);
    setActiveLayer("states");
    setSelectedId(null);
    setSelectedFeature(null);
    setSelectedState(null);
    setEmptyMessage(null);
    setSelectedDistrictEntityId(null);
    setDetailGeometriesByType({});
    setAttendanceFeatureCollection(null);
    setSchoolFeatureCollection(null);
    setLoadingAttendanceAreas(false);
    setLoadingSchools(false);
    setSchoolsScanned(null);
    setHoveredSchoolId(null);
    setSelectedSchoolId(null);
    setFitBoundsToken((token) => (token ?? 0) + 1);
  };

  useEffect(() => {
    if (!selectedDistrictEntityId) {
      setDetailGeometriesByType({});
      setAttendanceFeatureCollection(null);
      setSchoolFeatureCollection(null);
      setSchoolsScanned(null);
      setLoadingAttendanceAreas(false);
      setLoadingSchools(false);
      setHoveredSchoolId(null);
      setSelectedSchoolId(null);
      if (detailGeometryAbortRef.current) {
        detailGeometryAbortRef.current.abort();
        detailGeometryAbortRef.current = null;
      }
      if (detailGeometryDebounceRef.current) {
        window.clearTimeout(detailGeometryDebounceRef.current);
        detailGeometryDebounceRef.current = null;
      }
      return;
    }

    setSchoolsVisible(true);
    setHoveredSchoolId(null);
    setSelectedSchoolId(null);
  }, [selectedDistrictEntityId]);

  useEffect(() => {
    if (!selectedDistrictEntityId) return;

    const entityId = selectedDistrictEntityId;
    const cachedByType: EntityGeometriesByType = {};
    const requests: DetailRequest[] = [
      {
        geometryType: ATTENDANCE_GEOMETRY_TYPE,
        endpoint: "attendance-areas",
        setFeatureCollection: setAttendanceFeatureCollection,
        setLoading: setLoadingAttendanceAreas,
      },
      {
        geometryType: SCHOOL_GEOMETRY_TYPE,
        endpoint: "school-program-locations",
        setFeatureCollection: setSchoolFeatureCollection,
        setLoading: setLoadingSchools,
        setReturnedCount: setSchoolsScanned,
      },
    ];

    const pending = requests.filter((request) => {
      const cacheKey = detailCacheKey(entityId, request.geometryType);
      const cached = detailGeometryCacheRef.current.get(cacheKey);
      if (cached) {
        cachedByType[request.geometryType] = cached.geometryRows;
        request.setFeatureCollection(cached.featureCollection);
        if (request.setReturnedCount) {
          request.setReturnedCount(cached.returnedCount);
        }
        request.setLoading(false);
        return false;
      }
      return true;
    });

    if (Object.keys(cachedByType).length) {
      setDetailGeometriesByType(cachedByType);
    }

    if (!pending.length) return;

    if (detailGeometryAbortRef.current) {
      detailGeometryAbortRef.current.abort();
    }
    if (detailGeometryDebounceRef.current) {
      window.clearTimeout(detailGeometryDebounceRef.current);
    }

    const controller = new AbortController();
    detailGeometryAbortRef.current = controller;

    pending.forEach((request) => request.setLoading(true));

    detailGeometryDebounceRef.current = window.setTimeout(async () => {
      const tasks = pending.map((request) =>
        fetchMapGeometryDetail(
          entityId,
          request.endpoint,
          request.geometryType,
          { signal: controller.signal }
        )
          .then((result) => ({ request, result }))
          .catch((error) => ({ request, error }))
      );

      const results = await Promise.all(tasks);
      if (controller.signal.aborted) return;

      const updates: EntityGeometriesByType = {};
      results.forEach((entry) => {
        if ("result" in entry) {
          const { result } = entry;
          const cacheKey = detailCacheKey(entityId, result.geometryType);
          detailGeometryCacheRef.current.set(cacheKey, {
            geometryType: result.geometryType,
            featureCollection: result.featureCollection,
            geometryRows: result.geometryRows,
            returnedCount: result.returnedCount,
          });
          updates[result.geometryType] = result.geometryRows;
          entry.request.setFeatureCollection(result.featureCollection);
          if (entry.request.setReturnedCount) {
            entry.request.setReturnedCount(result.returnedCount);
          }
        } else {
          console.error(entry.error);
        }
        entry.request.setLoading(false);
      });

      if (Object.keys(updates).length) {
        setDetailGeometriesByType((prev) => mergeGeometries(prev, updates));
      }
    }, GEOMETRY_FETCH_DELAY_MS);

    return () => {
      controller.abort();
      if (detailGeometryDebounceRef.current) {
        window.clearTimeout(detailGeometryDebounceRef.current);
        detailGeometryDebounceRef.current = null;
      }
    };
  }, [selectedDistrictEntityId]);

  const tooltipBuilder = useMemo(() => {
    return (props: EntityMapProperties) => ({
      title: props.name ?? props.slug ?? "Entity",
      lines: [
        props.entity_type ? `Type: ${props.entity_type}` : null,
      ].filter((line): line is string => Boolean(line)),
    });
  }, []);

  const overlayTooltipBuilder = useMemo(() => {
    return (props: GeoJsonProperties) => {
      const record = (props ?? {}) as Record<string, unknown>;
      if (record.__geometry_type !== ATTENDANCE_GEOMETRY_TYPE) {
        return null;
      }
      const elemNames = normalizeNameList(record.elem_name);
      const middNames = normalizeNameList(record.midd_name);
      const highNames = normalizeNameList(record.high_name);
      const lines = [
        elemNames.length ? `Elementary: ${elemNames.join(", ")}` : null,
        middNames.length ? `Middle: ${middNames.join(", ")}` : null,
        highNames.length ? `High: ${highNames.join(", ")}` : null,
      ].filter((line): line is string => Boolean(line));
      if (!lines.length) return null;
      return {
        title: "Attendance area",
        lines: lines.length ? lines : undefined,
      };
    };
  }, []);

  const layerConfigByType = useMemo(
    () => new Map(GEOMETRY_LAYERS.map((layer) => [layer.geometryType, layer])),
    []
  );
  const attendanceVisible =
    activeLayer === "districts" && Boolean(selectedDistrictEntityId);
  const schoolsLayerVisible = attendanceVisible && schoolsVisible;
  const resolveLayerRows = useMemo(
    () =>
      (layer: (typeof GEOMETRY_LAYERS)[number]) => {
        const geometryTypes = [
          layer.geometryType,
          ...(layer.fallbackGeometryTypes ?? []),
        ];
        return geometryTypes.flatMap(
          (geometryType) => geometriesByType[geometryType] ?? []
        );
      },
    [geometriesByType]
  );

  useEffect(() => {
    if (!schoolsLayerVisible) {
      setHoveredSchoolId(null);
      setSelectedSchoolId(null);
    }
  }, [schoolsLayerVisible]);

  const visibleLayers = useMemo(() => {
    if (!attendanceVisible) return [];
    return GEOMETRY_LAYERS.filter((layer) => {
      if (layer.renderMode === "point" && !schoolsLayerVisible) {
        return false;
      }
      const rows = resolveLayerRows(layer);
      const hasGeojson = rows.some(
        (row) => row.geojson && row.geojson.features.length > 0
      );
      return hasGeojson;
    });
  }, [attendanceVisible, resolveLayerRows, schoolsLayerVisible]);

  const overlayFeatureCollection = useMemo<OverlayFeatureCollection | null>(() => {
    if (!attendanceVisible || !attendanceFeatureCollection) return null;
    if (!attendanceFeatureCollection.features.length) return null;
    const features = attendanceFeatureCollection.features.map((feature) => ({
      ...feature,
      properties: {
        ...(feature.properties ?? {}),
        __geometry_type: ATTENDANCE_GEOMETRY_TYPE,
      },
    }));
    return {
      type: "FeatureCollection",
      features,
    };
  }, [attendanceFeatureCollection, attendanceVisible]);

  const overlayStyle = useMemo(() => {
    return (feature: google.maps.Data.Feature) => {
      const geometryType = feature.getProperty("__geometry_type") as
        | string
        | undefined;
      const layer = geometryType ? layerConfigByType.get(geometryType) : null;
      if (!layer) return {};
      return {
        ...(layer.style ?? {}),
        ...(layer.zIndex !== undefined ? { zIndex: layer.zIndex } : {}),
      };
    };
  }, [layerConfigByType]);

  const schoolPoints = useMemo<SchoolPoint[]>(() => {
    if (!schoolsLayerVisible) return [];
    if (!schoolFeatureCollection) return [];

    const points: SchoolPoint[] = [];

    schoolFeatureCollection.features.forEach((feature, index) => {
      if (!feature.geometry || feature.geometry.type !== "Point") return;

      const coords = feature.geometry.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return;

      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const id = String(
        feature.id ?? feature.properties?.entity_id ?? `school:${index}`
      );

      points.push({
        id,
        position: { lat, lng },
        properties: { ...(feature.properties ?? {}) },
      });
    });

    return points;
  }, [schoolFeatureCollection, schoolsLayerVisible]);

  const schoolPointsById = useMemo(() => {
    const map = new Map<string, SchoolPoint>();
    for (const point of schoolPoints) {
      map.set(point.id, point);
    }
    return map;
  }, [schoolPoints]);

  const activeSchoolId = selectedSchoolId ?? hoveredSchoolId;
  const activeSchool = activeSchoolId
    ? schoolPointsById.get(activeSchoolId) ?? null
    : null;
  const activeSchoolInfo = useMemo(
    () => (activeSchool ? buildSchoolInfo(activeSchool.properties) : null),
    [activeSchool]
  );

  const brandAccent = useMemo(() => {
    if (typeof window === "undefined") {
      return DEFAULT_BRAND_COLORS.accent1;
    }
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue("--brand-accent-1")
      .trim();
    return value || DEFAULT_BRAND_COLORS.accent1;
  }, [selectedDistrictEntityId]);

  const schoolLayerConfig = layerConfigByType.get(SCHOOL_GEOMETRY_TYPE);
  const schoolBaseRadius = schoolLayerConfig?.pointRadiusMeters ?? 60;
  const schoolCircleOptions = useMemo(
    () => ({
      fillColor: brandAccent,
      fillOpacity: schoolLayerConfig?.pointFillOpacity ?? 0.9,
      strokeColor: brandAccent,
      strokeOpacity: schoolLayerConfig?.pointStrokeOpacity ?? 0.9,
      strokeWeight: schoolLayerConfig?.pointStrokeWeight ?? 1,
      clickable: true,
      zIndex: schoolLayerConfig?.zIndex,
    }),
    [brandAccent, schoolLayerConfig]
  );
  const loadingGeometries = loadingAttendanceAreas;

  const overlay = useMemo(() => {
    if (activeLayer !== "districts") return null;
    return (
      <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
        <button
          type="button"
          className="px-3 py-1 rounded bg-brand-secondary-1 text-brand-primary-1 hover:bg-brand-secondary-0"
          onClick={handleBack}
        >
          Back to States
        </button>
        <div className="rounded bg-brand-secondary-1 px-3 py-1 text-brand-primary-1">
          <div className="text-xs uppercase opacity-60">Viewing districts</div>
          <div className="font-semibold">
            {selectedState?.name ?? selectedState?.slug ?? "State"}
          </div>
        </div>
      </div>
    );
  }, [activeLayer, selectedState]);

  const layerControls = useMemo(() => {
    if (activeLayer !== "districts" || !selectedDistrictEntityId) return null;
    return (
      <div className="absolute top-4 right-4 z-50 w-72 max-w-[80vw] rounded-lg bg-brand-secondary-1 p-3 text-brand-primary-1">
        <div className="text-xs uppercase text-brand-primary-1 opacity-60">Layers</div>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={schoolsVisible}
            onChange={(event) => {
              const nextValue = event.target.checked;
              setSchoolsVisible(nextValue);
              console.log("Schools layer toggled:", nextValue);
            }}
          />
          <span>Schools</span>
        </label>
        {schoolsScanned !== null ? (
          <div className="mt-1 text-xs text-brand-primary-1 opacity-60">
            Schools scanned: {schoolsScanned}
          </div>
        ) : null}
        <LayerLegend
          title="Sources"
          visibleLayers={visibleLayers}
          geometriesByType={geometriesByType}
          className="mt-3 text-brand-primary-1"
        />
      </div>
    );
  }, [
    activeLayer,
    geometriesByType,
    selectedDistrictEntityId,
    schoolsVisible,
    visibleLayers,
    schoolsScanned,
  ]);

  const mapChildren =
    schoolsLayerVisible && schoolPoints.length ? (
      <>
        {schoolPoints.map((point) => {
          const isActive = point.id === activeSchoolId;
          return (
            <CircleF
              key={point.id}
              center={point.position}
              radius={isActive ? schoolBaseRadius * 1.4 : schoolBaseRadius}
              options={schoolCircleOptions}
              onMouseOver={() => {
                if (!selectedSchoolId) {
                  setHoveredSchoolId(point.id);
                }
              }}
              onMouseOut={() => {
                if (!selectedSchoolId) {
                  setHoveredSchoolId(null);
                }
              }}
              onClick={() => {
                setSelectedSchoolId(point.id);
              }}
            />
          );
        })}
        {activeSchool && activeSchoolInfo ? (
          <InfoWindowF
            position={activeSchool.position}
            onCloseClick={() => {
              setSelectedSchoolId(null);
              setHoveredSchoolId(null);
            }}
          >
            <div className="text-sm text-brand-secondary-1">
              <div className="font-semibold">{activeSchoolInfo.title}</div>
              {activeSchoolInfo.lines.length ? (
                <div className="mt-1 space-y-0.5 text-xs text-brand-secondary-0">
                  {activeSchoolInfo.lines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              ) : null}
            </div>
          </InfoWindowF>
        ) : null}
      </>
    ) : null;

  return (
    <div className="relative">
      <EntityMapShell
        featureCollection={featureCollection}
        selectedId={selectedId}
        fitBoundsToken={fitBoundsToken}
        onSelect={handleSelect}
        onClearSelection={() => {
          setSelectedId(null);
          setSelectedFeature(null);
        }}
        overlayFeatureCollection={attendanceVisible ? overlayFeatureCollection : null}
        overlayStyle={overlayStyle}
        isClickable={(props) =>
          activeLayer === "states" ? isClickable(props) : true
        }
        getTooltip={tooltipBuilder}
        getOverlayTooltip={
          attendanceVisible ? overlayTooltipBuilder : undefined
        }
        mapChildren={mapChildren}
        renderOverlay={({ scriptLoaded, loadError }) => (
          <>
            {overlay}
            {layerControls}
            {loadingChildLayer && (
              <div className="absolute top-4 right-4 z-50">
                <div className="px-3 py-1 rounded bg-brand-secondary-1 text-brand-primary-1 text-sm">
                  Loading districts...
                </div>
              </div>
            )}
            {loadingGeometries && (
              <div className="absolute top-14 right-4 z-50">
                <div className="px-3 py-1 rounded bg-brand-secondary-1 text-brand-primary-1 text-sm">
                  Loading district layers...
                </div>
              </div>
            )}
            {loadingSchools && schoolsLayerVisible && (
              <div className="absolute top-24 right-4 z-50">
                <div className="px-3 py-1 rounded bg-brand-secondary-1 text-brand-primary-1 text-sm">
                  Loading schools...
                </div>
              </div>
            )}
            {!scriptLoaded && !loadError && (
              <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                <div className="rounded bg-brand-secondary-1 text-brand-primary-1 text-sm px-4 py-2">
                  Loading map...
                </div>
              </div>
            )}
            {loadError && (
              <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                <div className="rounded bg-brand-secondary-1 text-brand-primary-1 text-sm px-4 py-3 text-center">
                  Map failed to load.
                  <div className="text-brand-accent-1 mt-1">{loadError}</div>
                </div>
              </div>
            )}
          </>
        )}
        renderPopup={
          activeLayer === "districts" && selectedFeature
            ? (feature) => (
                <div className="flex flex-col gap-3">
                  <DistrictPopUp district={feature} />
                  <LayerLegend
                    title="Layer sources"
                    visibleLayers={visibleLayers}
                    geometriesByType={geometriesByType}
                    className="rounded-xl border border-brand-secondary-1 bg-brand-secondary-1 p-3 text-brand-primary-1"
                  />
                </div>
              )
            : undefined
        }
        renderSearch={
          activeLayer === "districts"
            ? (features, onSelect) => (
                <DistrictSearch features={features} onSelect={onSelect} />
              )
            : undefined
        }
      />
      {loadingChildLayer && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <LoadingSpinner />
        </div>
      )}
      {activeLayer === "districts" && emptyMessage && !loadingChildLayer && (
        <div className="absolute bottom-6 left-4 z-50 text-yellow-300">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
