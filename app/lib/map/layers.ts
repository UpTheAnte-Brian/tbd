import { ATTENDANCE_OVERLAY_STYLE } from "@/app/components/map/attendance-overlay-style";

export type GeometryLayerConfig = {
  geometryType: string;
  label: string;
  renderMode: "polygon" | "polyline" | "point";
  fetchScope: "entity" | "child";
  fallbackGeometryTypes?: string[];
  relationshipType?: string;
  childEntityType?: string;
  childGeometryType?: string;
  primaryOnly?: boolean;
  minZoom?: number;
  zIndex?: number;
  defaultVisible?: boolean;
  style?: google.maps.Data.StyleOptions;
  pointRadiusMeters?: number;
  pointFillOpacity?: number;
  pointStrokeOpacity?: number;
  pointStrokeWeight?: number;
};

export const GEOMETRY_LAYERS: GeometryLayerConfig[] = [
  {
    geometryType: "boundary_simplified",
    label: "District Boundary",
    renderMode: "polygon",
    fetchScope: "entity",
    fallbackGeometryTypes: ["boundary"],
    zIndex: 1,
    defaultVisible: true,
    style: {
      fillOpacity: 0,
      strokeOpacity: 0.9,
      strokeWeight: 2,
      clickable: false,
      cursor: "default",
    },
  },
  {
    geometryType: "district_attendance_areas",
    label: "Attendance Areas",
    renderMode: "polygon",
    fetchScope: "entity",
    zIndex: 2,
    defaultVisible: true,
    style: ATTENDANCE_OVERLAY_STYLE,
  },
  {
    geometryType: "school_program_locations",
    label: "Schools",
    renderMode: "point",
    fetchScope: "child",
    relationshipType: "contains",
    childEntityType: "school",
    childGeometryType: "school_program_locations",
    primaryOnly: true,
    zIndex: 3,
    defaultVisible: true,
    pointRadiusMeters: 60,
    pointFillOpacity: 0.9,
    pointStrokeOpacity: 0.9,
    pointStrokeWeight: 1,
  },
];
