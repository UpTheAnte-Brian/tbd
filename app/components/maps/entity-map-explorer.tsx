/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EntityMapShell from "@/app/components/maps/entity-map-shell";
import DistrictSearch from "@/app/components/districts/district-search";
import DistrictPopUp from "@/app/components/districts/district-pop-up";
import LoadingSpinner from "@/app/components/loading-spinner";
import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type {
  EntityFeature,
  EntityFeatureCollection,
  EntityMapProperties,
} from "@/app/lib/types/map";

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
  featureCollection: EntityFeatureCollection;
};

type AttendanceFeatureCollection = FeatureCollection<Geometry, GeoJsonProperties>;

type AttendanceResponse = {
  geojson: AttendanceFeatureCollection | null;
};

const STATES_CACHE_KEY = "states:us";
const ATTENDANCE_FETCH_DELAY_MS = 150;

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
  const [attendanceOverlay, setAttendanceOverlay] =
    useState<AttendanceFeatureCollection | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const cacheRef = useRef(new Map<string, EntityFeatureCollection>());
  // Cache attendance overlays per district so swaps are instant.
  const attendanceCacheRef = useRef(
    new Map<string, AttendanceFeatureCollection | null>()
  );
  const attendanceAbortRef = useRef<AbortController | null>(null);
  const attendanceDebounceRef = useRef<number | null>(null);
  if (!cacheRef.current.has(STATES_CACHE_KEY)) {
    cacheRef.current.set(STATES_CACHE_KEY, initialStates);
  }

  const isClickable = (props: EntityMapProperties) =>
    props.active === true && props.child_count > 0;

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
      setAttendanceOverlay(null);
      setLoadingAttendance(false);
      setEmptyMessage(cached.features.length ? null : "Coming soon.");
      return;
    }

    setLoadingChildLayer(true);
    setEmptyMessage(null);
    try {
      const res = await fetch(
        `/api/map/entities/${parentId}/children?relationship=contains&geometry_type=boundary_simplified`,
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
      setAttendanceOverlay(null);
      setLoadingAttendance(false);
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
    setAttendanceOverlay(null);
    setLoadingAttendance(false);
  };

  useEffect(() => {
    if (!selectedDistrictEntityId) {
      setAttendanceOverlay(null);
      setLoadingAttendance(false);
      if (attendanceAbortRef.current) {
        attendanceAbortRef.current.abort();
        attendanceAbortRef.current = null;
      }
      if (attendanceDebounceRef.current) {
        window.clearTimeout(attendanceDebounceRef.current);
        attendanceDebounceRef.current = null;
      }
      return;
    }

    if (attendanceCacheRef.current.has(selectedDistrictEntityId)) {
      const cached =
        attendanceCacheRef.current.get(selectedDistrictEntityId) ?? null;
      setAttendanceOverlay(cached);
      setLoadingAttendance(false);
      return;
    }

    if (attendanceAbortRef.current) {
      attendanceAbortRef.current.abort();
    }
    if (attendanceDebounceRef.current) {
      window.clearTimeout(attendanceDebounceRef.current);
    }

    const controller = new AbortController();
    attendanceAbortRef.current = controller;
    setAttendanceOverlay(null);
    setLoadingAttendance(true);

    // Debounce rapid district clicks and abort stale requests.
    attendanceDebounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/entities/${selectedDistrictEntityId}/geometries?type=district_attendance_areas`,
          { cache: "no-store", signal: controller.signal }
        );
        if (!res.ok) {
          throw new Error("Failed to load attendance areas");
        }
        const data = (await res.json()) as AttendanceResponse;
        if (controller.signal.aborted) return;
        attendanceCacheRef.current.set(
          selectedDistrictEntityId,
          data.geojson ?? null
        );
        setAttendanceOverlay(data.geojson ?? null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        console.error(err);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingAttendance(false);
        }
      }
    }, ATTENDANCE_FETCH_DELAY_MS);

    return () => {
      controller.abort();
      if (attendanceDebounceRef.current) {
        window.clearTimeout(attendanceDebounceRef.current);
        attendanceDebounceRef.current = null;
      }
    };
  }, [selectedDistrictEntityId]);

  const tooltipBuilder = useMemo(() => {
    return (props: EntityMapProperties) => ({
      title: props.name ?? props.slug ?? "Entity",
      lines: [
        props.entity_type ? `Type: ${props.entity_type}` : null,
        props.child_count ? `Children: ${props.child_count}` : null,
      ].filter((line): line is string => Boolean(line)),
    });
  }, []);

  const attendanceTooltipBuilder = useMemo(() => {
    return (props: GeoJsonProperties) => {
      const record = (props ?? {}) as Record<string, unknown>;
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

  const overlay = useMemo(() => {
    if (activeLayer !== "districts") return null;
    return (
      <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
        <button
          type="button"
          className="px-3 py-1 rounded bg-white/10 text-white hover:bg-white/20"
          onClick={handleBack}
        >
          Back to States
        </button>
        <div className="text-white">
          <div className="text-xs uppercase text-white/60">
            Viewing districts
          </div>
          <div className="font-semibold">
            {selectedState?.name ?? selectedState?.slug ?? "State"}
          </div>
        </div>
      </div>
    );
  }, [activeLayer, selectedState]);

  return (
    <div className="relative">
      <EntityMapShell
        featureCollection={featureCollection}
        selectedId={selectedId}
        onSelect={handleSelect}
        onClearSelection={() => {
          setSelectedId(null);
          setSelectedFeature(null);
        }}
        overlayFeatureCollection={
          activeLayer === "districts" ? attendanceOverlay : null
        }
        isClickable={(props) =>
          activeLayer === "states" ? isClickable(props) : true
        }
        getTooltip={tooltipBuilder}
        getOverlayTooltip={
          activeLayer === "districts" ? attendanceTooltipBuilder : undefined
        }
        renderOverlay={({ scriptLoaded, loadError }) => (
          <>
            {overlay}
            {loadingChildLayer && (
              <div className="absolute top-4 right-4 z-50">
                <div className="px-3 py-1 rounded bg-black/70 text-white text-sm">
                  Loading districts...
                </div>
              </div>
            )}
            {loadingAttendance && (
              <div className="absolute top-14 right-4 z-50">
                <div className="px-3 py-1 rounded bg-black/70 text-white text-sm">
                  Loading attendance areas...
                </div>
              </div>
            )}
            {!scriptLoaded && !loadError && (
              <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                <div className="rounded bg-black/70 text-white text-sm px-4 py-2">
                  Loading map...
                </div>
              </div>
            )}
            {loadError && (
              <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                <div className="rounded bg-black/80 text-white text-sm px-4 py-3 text-center">
                  Map failed to load.
                  <div className="text-red-300 mt-1">{loadError}</div>
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
