import type { Feature, MultiPolygon, Polygon } from "geojson";
import { DistrictProperties } from "./interfaces";

export type DistrictFeature = Feature<
    Polygon | MultiPolygon,
    DistrictProperties
>;

export type MarkerType = {
    id: string;
    location: google.maps.LatLngLiteral;
    name: string;
    phone_number: string;
    website: string;
};
