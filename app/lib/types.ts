import type { Feature, Geometry, MultiPolygon, Polygon } from "geojson";

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

export interface ExtendedFeature<
    G extends Geometry = Geometry,
    P = DistrictProperties,
> extends Feature<G, P> {
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

export interface DistrictWithFoundation
    extends ExtendedFeature<Polygon | MultiPolygon, DistrictProperties> {
    id: string; // <-- UUID from Supabase
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

export interface District {
    id: string;
    sdorgid: string;
    shortname: string;
}

export interface UserWithDistricts {
    id: string;
    full_name: string;
    districts: District[];
}

// type for each district_user row returned by Supabase
// each district_user row
export interface DistrictUserRow {
    role: string;
    district_id: string;
    user_id: string;
    district: District;
}

export interface Profile {
    id: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    updated_at: string | null;
    username: string | null;
    avatar_url: string | null;
    website: string | null;
    district_users: DistrictUserRow[];
    role: string | null;
}

export type ApiDistrict = {
    sdorgid: string;
    shortname: string;
    metadata: {
        logo_path: string | null;
        extra_info?: ExtraInfo;
    } | null;
};

export interface SubMenu {
    name: string;
    desc?: string;
    icon: string;
    path: string;
    method: string;
    authRequired?: boolean;
    roles?: string[];
}
export interface Menu {
    name: string;
    subMenuHeading?: string[];
    subMenu?: SubMenu[];
    gridCols?: number;
    path: string;
}

export interface User {
    // instance_id: string; // uuid
    id: string; // uuid
    // aud: string;
    role?: string;
    email?: string;
    // encrypted_password: string;
    // email_confirmed_at: string | null; // ISO timestamp
    // invited_at: string | null; // ISO timestamp
    // confirmation_token: string;
    // confirmation_sent_at: string | null; // ISO timestamp
    // recovery_token: string;
    // recovery_sent_at: string | null; // ISO timestamp
    // email_change_token_new: string;
    // email_change: string;
    // email_change_sent_at: string | null; // ISO timestamp
    // last_sign_in_at: string | null; // ISO timestamp
    // raw_app_meta_data: Record<string, unknown>;
    // raw_user_meta_data: Record<string, unknown>;
    // is_super_admin: boolean;
    // created_at: string; // ISO timestamp
    // updated_at: string; // ISO timestamp
    // phone: string;
    // phone_confirmed_at: string | null; // ISO timestamp
    // phone_change: string;
    // phone_change_token: string;
    // phone_change_sent_at: string | null; // ISO timestamp
    // confirmed_at: string | null; // ISO timestamp
    // email_change_token_current: string;
    // email_change_confirm_status: number;
    // banned_until: string | null; // ISO timestamp
    // reauthentication_token: string;
    // reauthentication_sent_at: string | null; // ISO timestamp
    // is_sso_user: boolean;
    // deleted_at: string | null; // ISO timestamp
    // is_anonymous: boolean;
}

export interface KmlFeatureData {
    author: {
        email: string;
        name: string;
        uri: string;
    };
    description: string;
    id: string;
    infoWindowHtml: string;
    name: string;
    snippet: string;
    position: google.maps.LatLng | google.maps.LatLngLiteral | undefined;
    content: string;
    pixelOffset: google.maps.Size | null;
}
