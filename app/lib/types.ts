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
    id?: string | null;
    district_id: string;
    name: string | null;
    contact: string | null;
    website: string | null;
    founding_year: number | null;
    average_class_size: number | null;
    balance_sheet: number | null;
    // inserted_at: string; // ISO timestamp
    // updated_at: string; // ISO timestamp
    users?: BusinessUserJoined[]; // optional list of related users
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
    foundation?: Foundation | null;
    metadata: DistrictMetadata | null;
    users?: BusinessUserJoined[]; // optional list of related users
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

export interface DistrictUserRow {
    district_id: string;
    user_id: string;
    role: DistrictUserRole;
}

export interface DistrictUserJoined extends DistrictUserRow {
    district: District;
    user: Profile;
}
// each district_user row
export interface BusinessUserRow {
    business_id: string;
    user_id: string;
    role: BusinessUserRole;
}

export interface BusinessUserJoined extends BusinessUserRow {
    business: Business;
    user: Profile;
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
    district_users: (DistrictUserRow | DistrictUserJoined)[];
    business_users: (BusinessUserRow | BusinessUserJoined)[];
    global_role: string | null;
    address: string | null;
    phone_number: string | null;
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
    authRequired?: boolean;
    roles?: string[];
}

export interface User {
    // instance_id: string; // uuid
    id: string; // uuid
    // aud: string;
    role?: string;
    email?: string;
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

export interface Receipt {
    id: string;
    stripe_session_id: string;
    amount: number;
    date: string;
    district_name?: string;
    user_id?: string;
    type?: string;
    email?: string;
    receipt_url?: string;
    subscription_id?: string;
    invoice_id?: string;
}

export type PlaceDetailsType = {
    name: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    place_id?: string;
    website?: string;
    rating?: number;
    user_ratings_total?: number;
    geometry?: {
        location: {
            lat?: number;
            lng?: number;
        };
    };
    types?: string[];
};
export interface BusinessUser {
    id: string;
    business_id: string;
    user_id: string;
    role: BusinessUserRole;
    created_at: string;
}

export interface DistrictUser {
    id: string;
    district_id: string;
    user_id: string;
    role: DistrictUserRole;
    created_at: string;
}

export interface FoundationUser {
    id: string;
    foundation_id: string;
    user_id: string;
    role: FoundationUserRole;
    created_at: string;
}

export interface Campaign {
    id: string;
    business_id?: string;
    district_id?: string;
    campaign_type: CampaignType;
    status: "pending" | "active" | "ended";
    created_at: string;
    updated_at: string;
}
export type BusinessStatus =
    | "pending"
    | "active"
    | "inactive"
    | "verified"
    | "rejected";
export type BusinessUserRole = "owner" | "employee" | "patron";
export type DistrictUserRole =
    | "superintendent"
    | "athletic director"
    | "admin"
    | "teacher";
export type FoundationUserRole =
    | "President"
    | "board member"
    | "Patron";
export type CampaignType = "round_up" | "percent" | "flat";
export type CampaignStatus = "pending" | "scheduled" | "active" | "ended";

export interface Business {
    id: string;
    place_id?: string;
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
    phone_number?: string;
    website?: string;
    types?: string[];
    status: BusinessStatus;
    created_at: string;
    updated_at: string;
    users?: BusinessUserJoined[]; // optional list of related users
}

export interface BusinessUser {
    id: string;
    business_id: string;
    user_id: string;
    role: BusinessUserRole;
    created_at: string;
}

export interface BusinessCampaign {
    id: string;
    business_id: string;
    district_id: string;
    campaign_type: CampaignType;
    status: CampaignStatus;
    created_at: string;
    updated_at: string;
}

// Added UserRolesAssignments with arrays of strings for each entity type to avoid runtime error
export const RoleOptions = {
    business: ["owner", "employee", "patron"] as const,
    district: [
        "superintendent",
        "athletic director",
        "admin",
        "teacher",
    ] as const,
    foundation: ["President", "board member", "Patron"] as const,
};
