/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { CircleF, InfoWindowF } from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EntityMapShell from "@/app/components/map/entity-map-shell";
import DistrictSearch from "@/app/components/districts/district-search";
import DistrictPopUp from "@/app/components/districts/district-pop-up";
import LoadingSpinner from "@/app/components/loading-spinner";
import LayerSources from "@/app/components/map/LayerSources";
import { DEFAULT_BRAND_COLORS } from "@/app/lib/branding/resolveBranding";
import {
  fetchChildGeometriesByRelationship,
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

type MapPoint = {
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
const NONPROFIT_GEOMETRY_TYPE = "nonprofit_locations";

const detailCacheKey = (entityId: string, geometryType: string) =>
  `${entityId}:${geometryType}`;

const mergeGeometries = (
  base: EntityGeometriesByType,
  next: EntityGeometriesByType,
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

const buildPointList = (
  featureCollection: OverlayFeatureCollection | null,
  fallbackPrefix: string,
): MapPoint[] => {
  if (!featureCollection) return [];

  const points: MapPoint[] = [];

  featureCollection.features.forEach((feature, index) => {
    if (!feature.geometry || feature.geometry.type !== "Point") return;

    const coords = feature.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return;

    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const id = String(
      feature.id ??
        feature.properties?.entity_id ??
        `${fallbackPrefix}:${index}`,
    );

    points.push({
      id,
      position: { lat, lng },
      properties: { ...(feature.properties ?? {}) },
    });
  });

  return points;
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

const buildNonprofitInfo = (props: GeoJsonProperties): SchoolInfo => {
  const record = (props ?? {}) as Record<string, unknown>;
  const rawTitle =
    coerceDisplayValue(record.name) ??
    coerceDisplayValue(record.entity_name) ??
    coerceDisplayValue(record.entity_slug) ??
    "Nonprofit";
  const title = rawTitle === "Nonprofit" ? rawTitle : `Nonprofit: ${rawTitle}`;
  const slugValue =
    coerceDisplayValue(record.slug) ?? coerceDisplayValue(record.entity_slug);
  const entityId = coerceDisplayValue(record.entity_id);
  const lines = [
    slugValue ? `Slug: ${slugValue}` : null,
    entityId ? `Entity ID: ${entityId}` : null,
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
    null,
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
  const [loadingAttendanceAreas, setLoadingAttendanceAreas] = useState(false);
  const [schoolsVisible, setSchoolsVisible] = useState(true);
  const [schoolFeatureCollection, setSchoolFeatureCollection] =
    useState<OverlayFeatureCollection | null>(null);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [schoolsScanned, setSchoolsScanned] = useState<number | null>(null);
  const [hoveredSchoolId, setHoveredSchoolId] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [nonprofitsVisible, setNonprofitsVisible] = useState(false);
  const [nonprofitFeatureCollection, setNonprofitFeatureCollection] =
    useState<OverlayFeatureCollection | null>(null);
  const [loadingNonprofits, setLoadingNonprofits] = useState(false);
  const [nonprofitsScanned, setNonprofitsScanned] = useState<number | null>(
    null,
  );
  const [hoveredNonprofitId, setHoveredNonprofitId] = useState<string | null>(
    null,
  );
  const [selectedNonprofitId, setSelectedNonprofitId] = useState<string | null>(
    null,
  );
  const [fitBoundsToken, setFitBoundsToken] = useState<number | null>(null);

  const cacheRef = useRef(new Map<string, EntityFeatureCollection>());
  const detailGeometryCacheRef = useRef(new Map<string, DetailCacheEntry>());
  const detailGeometryAbortRef = useRef<AbortController | null>(null);
  const detailGeometryDebounceRef = useRef<number | null>(null);
  const nonprofitAbortRef = useRef<AbortController | null>(null);
  const geometriesByType = useMemo(
    () => detailGeometriesByType,
    [detailGeometriesByType],
  );
  if (!cacheRef.current.has(STATES_CACHE_KEY)) {
    cacheRef.current.set(STATES_CACHE_KEY, initialStates);
  }

  useEffect(() => {
    if (initialStates.features.length > 0) return;
    let cancelled = false;

    async function loadStates() {
      try {
        const res = await fetch("/api/map/home");
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
      setNonprofitFeatureCollection(null);
      setLoadingAttendanceAreas(false);
      setLoadingSchools(false);
      setLoadingNonprofits(false);
      setSchoolsScanned(null);
      setNonprofitsScanned(null);
      setNonprofitsVisible(false);
      setEmptyMessage(cached.features.length ? null : "Coming soon.");
      return;
    }

    setLoadingChildLayer(true);
    setEmptyMessage(null);
    try {
      const res = await fetch(
        `/api/map/entities/${parentId}/children?relationship=contains&entity_type=district&geometry_type=boundary&limit=400`,
        { cache: "no-store" },
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
      setNonprofitFeatureCollection(null);
      setLoadingAttendanceAreas(false);
      setLoadingSchools(false);
      setLoadingNonprofits(false);
      setSchoolsScanned(null);
      setNonprofitsScanned(null);
      setNonprofitsVisible(false);
      setEmptyMessage(
        data.featureCollection.features.length ? null : "Coming soon.",
      );
    } catch (err) {
      console.error(err);
      setEmptyMessage("Unable to load districts for this state.");
      setActiveLayer("districts");
    } finally {
      setLoadingChildLayer(false);
    }
  };

  const handleBack = useCallback(() => {
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
    setNonprofitFeatureCollection(null);
    setLoadingAttendanceAreas(false);
    setLoadingSchools(false);
    setLoadingNonprofits(false);
    setSchoolsScanned(null);
    setNonprofitsScanned(null);
    setNonprofitsVisible(false);
    setHoveredSchoolId(null);
    setSelectedSchoolId(null);
    setHoveredNonprofitId(null);
    setSelectedNonprofitId(null);
    setFitBoundsToken((token) => (token ?? 0) + 1);
  }, [initialStates]);

  useEffect(() => {
    if (!selectedDistrictEntityId) {
      setDetailGeometriesByType({});
      setAttendanceFeatureCollection(null);
      setSchoolFeatureCollection(null);
      setNonprofitFeatureCollection(null);
      setSchoolsScanned(null);
      setNonprofitsScanned(null);
      setLoadingAttendanceAreas(false);
      setLoadingSchools(false);
      setLoadingNonprofits(false);
      setHoveredSchoolId(null);
      setSelectedSchoolId(null);
      setHoveredNonprofitId(null);
      setSelectedNonprofitId(null);
      setNonprofitsVisible(false);
      if (detailGeometryAbortRef.current) {
        detailGeometryAbortRef.current.abort();
        detailGeometryAbortRef.current = null;
      }
      if (detailGeometryDebounceRef.current) {
        window.clearTimeout(detailGeometryDebounceRef.current);
        detailGeometryDebounceRef.current = null;
      }
      if (nonprofitAbortRef.current) {
        nonprofitAbortRef.current.abort();
        nonprofitAbortRef.current = null;
      }
      return;
    }

    setSchoolsVisible(true);
    setNonprofitsVisible(false);
    setHoveredSchoolId(null);
    setSelectedSchoolId(null);
    setHoveredNonprofitId(null);
    setSelectedNonprofitId(null);
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
          { signal: controller.signal },
        )
          .then((result) => ({ request, result }))
          .catch((error) => ({ request, error })),
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

  useEffect(() => {
    if (!selectedDistrictEntityId || !nonprofitsVisible) {
      setNonprofitFeatureCollection(null);
      setNonprofitsScanned(null);
      setLoadingNonprofits(false);
      setHoveredNonprofitId(null);
      setSelectedNonprofitId(null);
      if (nonprofitAbortRef.current) {
        nonprofitAbortRef.current.abort();
        nonprofitAbortRef.current = null;
      }
      return;
    }

    const entityId = selectedDistrictEntityId;
    const cacheKey = detailCacheKey(entityId, NONPROFIT_GEOMETRY_TYPE);
    const cached = detailGeometryCacheRef.current.get(cacheKey);
    if (cached) {
      setNonprofitFeatureCollection(cached.featureCollection);
      setNonprofitsScanned(cached.returnedCount ?? null);
      if (cached.geometryRows.length) {
        setDetailGeometriesByType((prev) =>
          mergeGeometries(prev, {
            [NONPROFIT_GEOMETRY_TYPE]: cached.geometryRows,
          }),
        );
      }
      setLoadingNonprofits(false);
      return;
    }

    if (nonprofitAbortRef.current) {
      nonprofitAbortRef.current.abort();
    }

    const controller = new AbortController();
    nonprofitAbortRef.current = controller;
    setLoadingNonprofits(true);

    const loadNonprofits = async () => {
      const childUrl = `/api/map/entities/${entityId}/children?relationship=contains&entity_type=nonprofit&geometry_type=${NONPROFIT_GEOMETRY_TYPE}`;

      const childPromise = fetch(childUrl, {
        cache: "no-store",
        signal: controller.signal,
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to load nonprofit map layer");
        }
        return (await res.json()) as ChildrenResponse;
      });

      const geometryPromise = fetchChildGeometriesByRelationship(
        entityId,
        {
          relationshipType: "contains",
          childEntityType: "nonprofit",
          childGeometryType: NONPROFIT_GEOMETRY_TYPE,
          primaryOnly: true,
        },
        { signal: controller.signal },
      );

      const [childResult, geometryResult] = await Promise.allSettled([
        childPromise,
        geometryPromise,
      ]);

      if (controller.signal.aborted) return;

      let featureCollection: OverlayFeatureCollection | null = null;
      let returnedCount: number | null = null;
      let geometryRows: EntityGeometryRow[] = [];

      if (childResult.status === "fulfilled") {
        featureCollection = childResult.value.featureCollection;
        returnedCount =
          typeof childResult.value.returned_count === "number"
            ? childResult.value.returned_count
            : featureCollection.features.length;
      } else {
        console.error(childResult.reason);
      }

      if (geometryResult.status === "fulfilled") {
        geometryRows = geometryResult.value[NONPROFIT_GEOMETRY_TYPE] ?? [];
      } else {
        console.error(geometryResult.reason);
      }

      if (featureCollection) {
        setNonprofitFeatureCollection(featureCollection);
        setNonprofitsScanned(returnedCount);
      } else {
        setNonprofitFeatureCollection(null);
        setNonprofitsScanned(null);
      }

      if (geometryRows.length) {
        setDetailGeometriesByType((prev) =>
          mergeGeometries(prev, {
            [NONPROFIT_GEOMETRY_TYPE]: geometryRows,
          }),
        );
      }

      if (featureCollection) {
        detailGeometryCacheRef.current.set(cacheKey, {
          geometryType: NONPROFIT_GEOMETRY_TYPE,
          featureCollection,
          geometryRows,
          returnedCount: returnedCount ?? 0,
        });
      }

      setLoadingNonprofits(false);
    };

    void loadNonprofits();

    return () => {
      controller.abort();
      if (nonprofitAbortRef.current === controller) {
        nonprofitAbortRef.current = null;
      }
    };
  }, [nonprofitsVisible, selectedDistrictEntityId]);

  const tooltipBuilder = useMemo(() => {
    return (props: EntityMapProperties) => ({
      title: props.name ?? props.slug ?? "Entity",
      lines: [props.entity_type ? `Type: ${props.entity_type}` : null].filter(
        (line): line is string => Boolean(line),
      ),
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
    [],
  );
  const attendanceVisible =
    activeLayer === "districts" && Boolean(selectedDistrictEntityId);
  const schoolsLayerVisible = attendanceVisible && schoolsVisible;
  const nonprofitsLayerVisible = attendanceVisible && nonprofitsVisible;
  const pointLayerVisibility = useMemo<Record<string, boolean>>(
    () => ({
      [SCHOOL_GEOMETRY_TYPE]: schoolsLayerVisible,
      [NONPROFIT_GEOMETRY_TYPE]: nonprofitsLayerVisible,
    }),
    [nonprofitsLayerVisible, schoolsLayerVisible],
  );
  const resolveLayerRows = useMemo(
    () => (layer: (typeof GEOMETRY_LAYERS)[number]) => {
      const geometryTypes = [
        layer.geometryType,
        ...(layer.fallbackGeometryTypes ?? []),
      ];
      return geometryTypes.flatMap(
        (geometryType) => geometriesByType[geometryType] ?? [],
      );
    },
    [geometriesByType],
  );

  useEffect(() => {
    if (!schoolsLayerVisible) {
      setHoveredSchoolId(null);
      setSelectedSchoolId(null);
    }
  }, [schoolsLayerVisible]);

  useEffect(() => {
    if (!nonprofitsLayerVisible) {
      setHoveredNonprofitId(null);
      setSelectedNonprofitId(null);
    }
  }, [nonprofitsLayerVisible]);

  const visibleLayers = useMemo(() => {
    if (!attendanceVisible) return [];
    return GEOMETRY_LAYERS.filter((layer) => {
      if (layer.renderMode === "point") {
        const visible = pointLayerVisibility[layer.geometryType];
        if (visible === false) return false;
      }
      const rows = resolveLayerRows(layer);
      const hasGeojson = rows.some(
        (row) => row.geojson && row.geojson.features.length > 0,
      );
      return hasGeojson;
    });
  }, [attendanceVisible, pointLayerVisibility, resolveLayerRows]);

  const overlayFeatureCollection =
    useMemo<OverlayFeatureCollection | null>(() => {
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

  const schoolPoints = useMemo<MapPoint[]>(() => {
    if (!schoolsLayerVisible) return [];
    return buildPointList(schoolFeatureCollection, "school");
  }, [schoolFeatureCollection, schoolsLayerVisible]);

  const nonprofitPoints = useMemo<MapPoint[]>(() => {
    if (!nonprofitsLayerVisible) return [];
    return buildPointList(nonprofitFeatureCollection, "nonprofit");
  }, [nonprofitFeatureCollection, nonprofitsLayerVisible]);

  const schoolPointsById = useMemo(() => {
    const map = new Map<string, MapPoint>();
    for (const point of schoolPoints) {
      map.set(point.id, point);
    }
    return map;
  }, [schoolPoints]);

  const nonprofitPointsById = useMemo(() => {
    const map = new Map<string, MapPoint>();
    for (const point of nonprofitPoints) {
      map.set(point.id, point);
    }
    return map;
  }, [nonprofitPoints]);

  const activeSchoolId = selectedSchoolId ?? hoveredSchoolId;
  const activeSchool = activeSchoolId
    ? (schoolPointsById.get(activeSchoolId) ?? null)
    : null;
  const activeSchoolInfo = useMemo(
    () => (activeSchool ? buildSchoolInfo(activeSchool.properties) : null),
    [activeSchool],
  );

  const activeNonprofitId = selectedNonprofitId ?? hoveredNonprofitId;
  const activeNonprofit = activeNonprofitId
    ? (nonprofitPointsById.get(activeNonprofitId) ?? null)
    : null;
  const activeNonprofitInfo = useMemo(
    () =>
      activeNonprofit ? buildNonprofitInfo(activeNonprofit.properties) : null,
    [activeNonprofit],
  );

  const brandAccent = useMemo(() => {
    if (typeof window === "undefined") {
      return DEFAULT_BRAND_COLORS.accent1;
    }
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue("--brand-accent-1")
      .trim();
    return value || DEFAULT_BRAND_COLORS.accent1;
  }, []);

  const brandAccentAlt = useMemo(() => {
    if (typeof window === "undefined") {
      return DEFAULT_BRAND_COLORS.accent2;
    }
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue("--brand-accent-2")
      .trim();
    return value || DEFAULT_BRAND_COLORS.accent2;
  }, []);

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
    [brandAccent, schoolLayerConfig],
  );

  const nonprofitLayerConfig = layerConfigByType.get(NONPROFIT_GEOMETRY_TYPE);
  const nonprofitBaseRadius = nonprofitLayerConfig?.pointRadiusMeters ?? 70;
  const nonprofitCircleOptions = useMemo(
    () => ({
      fillColor: brandAccentAlt,
      fillOpacity: nonprofitLayerConfig?.pointFillOpacity ?? 0.9,
      strokeColor: brandAccentAlt,
      strokeOpacity: nonprofitLayerConfig?.pointStrokeOpacity ?? 0.9,
      strokeWeight: nonprofitLayerConfig?.pointStrokeWeight ?? 1,
      clickable: true,
      zIndex: nonprofitLayerConfig?.zIndex,
    }),
    [brandAccentAlt, nonprofitLayerConfig],
  );
  const loadingGeometries = loadingAttendanceAreas;
  const layerLoadingByType = useMemo(
    () => ({
      district_attendance_areas: loadingGeometries,
      school_program_locations: loadingSchools && schoolsLayerVisible,
      nonprofit_locations: loadingNonprofits && nonprofitsLayerVisible,
    }),
    [
      loadingGeometries,
      loadingNonprofits,
      loadingSchools,
      nonprofitsLayerVisible,
      schoolsLayerVisible,
    ],
  );

  const districtControls = useMemo(() => {
    if (activeLayer !== "districts" && !loadingChildLayer) return null;
    return (
      <div className="absolute top-4 left-4 z-50 w-[min(100%,520px)] sm:min-w-[320px]">
        <div className="rounded-xl border border-border-subtle bg-surface-nav p-3 text-text-on-dark shadow-lg">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded bg-surface-accent px-3 py-1 text-sm font-semibold text-text-on-dark hover:bg-brand-primary-2"
              onClick={handleBack}
            >
              Back to States
            </button>
            <div className="rounded bg-surface-inset px-3 py-1 text-text-on-light">
              <div className="text-xs uppercase text-brand-secondary-0">
                Viewing districts
              </div>
              <div className="font-semibold">
                {selectedState?.name ?? selectedState?.slug ?? "State"}
              </div>
            </div>
          </div>
          {loadingChildLayer ? (
            <div className="mt-3 rounded bg-surface-inset px-3 py-1 text-xs text-brand-secondary-0">
              Loading districts...
            </div>
          ) : null}
          {selectedDistrictEntityId ? (
            <div className="mt-3 rounded-lg border border-border-subtle bg-surface-card p-3 text-text-on-light">
              <div className="text-xs uppercase tracking-[0.18em] text-brand-secondary-0">
                Layers
              </div>
              <label className="mt-2 m-0 flex items-center gap-2 text-sm font-medium normal-case tracking-normal text-text-on-light">
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
                <div className="mt-1 text-xs text-brand-secondary-0">
                  School Program Locations: {schoolsScanned}
                </div>
              ) : null}
              <label className="mt-3 m-0 flex items-center gap-2 text-sm font-medium normal-case tracking-normal text-text-on-light">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={nonprofitsVisible}
                  onChange={(event) => {
                    const nextValue = event.target.checked;
                    setNonprofitsVisible(nextValue);
                    console.log("Nonprofits layer toggled:", nextValue);
                  }}
                />
                <span>Nonprofits</span>
              </label>
              {nonprofitsScanned !== null ? (
                <div className="mt-1 text-xs text-brand-secondary-0">
                  Nonprofit Locations: {nonprofitsScanned}
                </div>
              ) : null}
              <LayerSources
                visibleLayers={visibleLayers}
                geometriesByType={geometriesByType}
                loadingByType={layerLoadingByType}
                className="mt-3"
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }, [
    activeLayer,
    geometriesByType,
    handleBack,
    layerLoadingByType,
    loadingChildLayer,
    nonprofitsScanned,
    nonprofitsVisible,
    selectedDistrictEntityId,
    selectedState,
    schoolsScanned,
    schoolsVisible,
    visibleLayers,
  ]);

  const showSchools = schoolsLayerVisible && schoolPoints.length > 0;
  const showNonprofits = nonprofitsLayerVisible && nonprofitPoints.length > 0;

  const mapChildren =
    showSchools || showNonprofits ? (
      <>
        {showSchools
          ? schoolPoints.map((point) => {
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
            })
          : null}
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
        {showNonprofits
          ? nonprofitPoints.map((point) => {
              const isActive = point.id === activeNonprofitId;
              return (
                <CircleF
                  key={point.id}
                  center={point.position}
                  radius={
                    isActive ? nonprofitBaseRadius * 1.4 : nonprofitBaseRadius
                  }
                  options={nonprofitCircleOptions}
                  onMouseOver={() => {
                    if (!selectedNonprofitId) {
                      setHoveredNonprofitId(point.id);
                    }
                  }}
                  onMouseOut={() => {
                    if (!selectedNonprofitId) {
                      setHoveredNonprofitId(null);
                    }
                  }}
                  onClick={() => {
                    setSelectedNonprofitId(point.id);
                  }}
                />
              );
            })
          : null}
        {activeNonprofit && activeNonprofitInfo ? (
          <InfoWindowF
            position={activeNonprofit.position}
            onCloseClick={() => {
              setSelectedNonprofitId(null);
              setHoveredNonprofitId(null);
            }}
          >
            <div className="text-sm text-brand-secondary-1">
              <div className="font-semibold">{activeNonprofitInfo.title}</div>
              {activeNonprofitInfo.lines.length ? (
                <div className="mt-1 space-y-0.5 text-xs text-brand-secondary-0">
                  {activeNonprofitInfo.lines.map((line) => (
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
        overlayFeatureCollection={
          attendanceVisible ? overlayFeatureCollection : null
        }
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
            {districtControls}
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
            ? (feature) => <DistrictPopUp district={feature} />
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
