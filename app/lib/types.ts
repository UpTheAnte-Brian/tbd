import type { Feature, Geometry } from "geojson";

// export type DistrictFeature = Feature<
//     Polygon | MultiPolygon,
//     DistrictProperties
// >;

export type MarkerType = {
    id: string;
    location: google.maps.LatLngLiteral;
    name: string;
    phone_number: string;
    website: string;
};

export interface Foundation {
    id: string;
    district_id: string;
    name: string | null;
    contact: string | null;
    website: string | null;
    founding_year: number | null;
    average_class_size: number | null;
    balance_sheet: number | null;
    inserted_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
}

export interface ExtendedFeature extends Feature<Geometry, DistrictProperties> {
    centroid_lat?: number;
    centroid_lng?: number;
    sdorgid: string;
    shortname: string;
}
export interface DistrictProperties {
    ACRES: string;
    FORMID: string;
    SDTYPE: string;
    SDORGID: string;
    SQMILES: string;
    WEB_URL: string;
    PREFNAME: string;
    SDNUMBER: string;
    SHORTNAME: string;
    Shape_Area: string;
    Shape_Leng: string;
}

export type LatLngLiteral = google.maps.LatLngLiteral;

export interface DistrictWithFoundation extends ExtendedFeature {
    foundation: Foundation | null;
    metadata: DistrictMetadata | null;
}

export interface DistrictMetadata {
    logo_path: string | null;
    extra_info?: ExtraInfo;
}

export interface ExtraInfo {
    tagline?: string;
    primaryColor?: string;
    secondaryColor?: string;
    contactEmail?: string;
    notes?: string;
}

export type ApiDistrict = {
    sdorgid: string;
    shortname: string;
    metadata: {
        logo_path: string | null;
        extra_info?: ExtraInfo;
    } | null;
};
