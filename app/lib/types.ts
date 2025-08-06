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
    acres: string; // "514149.7135"
    formid: string; // "0004-01"
    sdtype: string; // "01"
    sdorgid: string; // "10004000000.0"
    sqmiles: string; // "803.3552"
    web_url: string; // "https://www.mcgregor.k12.mn.us/"
    prefname: string; // "McGregor Public School District"
    sdnumber: string; // "0004"
    shortname: string; // "McGregor"
    shape_area: string; // "2080689853.05"
    shape_leng: string; // "327108.90135599999"
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
