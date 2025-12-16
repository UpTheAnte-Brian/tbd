// import { Nonprofit } from "@/app/lib/types/nonprofits";
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
    users?: EntityUser[]; // optional list of related users
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
    users?: EntityUser[]; // optional list of related users
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

export type EntityType = "district" | "nonprofit" | "business";
export type EntityUserRole = "admin" | "editor" | "viewer" | "employee";

export interface EntityUser {
    id: string;
    entity_type: EntityType;
    entity_id: string;
    user_id: string;
    role: EntityUserRole;
    status?: "active" | "invited" | "removed" | null;
    created_at?: string | null;
    updated_at?: string | null;
    profile?: ProfilePreview | null;
}

export type ProfilePreview = Partial<Profile> & { id: string };

export interface Profile {
    id: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    updated_at: string | null;
    username: string | null;
    avatar_url: string | null;
    website: string | null;
    entity_users?: EntityUser[];
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

// export interface User {
//     // instance_id: string; // uuid
//     id: string; // uuid
//     // aud: string;
//     role?: string;
//     email?: string;
// }

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
// Legacy user role interfaces removed in favor of EntityUser

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
// Legacy role types removed in favor of EntityUserRole
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
    users?: EntityUser[]; // optional list of related users
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
    business: [] as const,
    district: [] as const,
    foundation: [] as const,
};

// =========================
// Branding Summary Response
// =========================

export interface BrandingLogo {
    id: string;
    district_id: string;
    school_id?: string | null;
    category: string;
    subcategory?: string | null;
    name: string;
    description?: string | null;
    file_png?: string | null;
    file_jpg?: string | null;
    file_svg?: string | null;
    file_eps?: string | null;
    created_at: string;
    updated_at?: string | null;
}

export interface BrandingPattern {
    id: string;
    district_id: string;
    pattern_type: "small" | "large";
    allowed_colors?: string[] | null;
    file_png?: string | null;
    file_svg?: string | null;
    notes?: string | null;
    created_at: string;
    updated_at?: string | null;
}

export interface BrandingFont {
    id: string;
    district_id: string;
    family: string;
    weight?: string | null;
    style?: string | null;
    file_ttf?: string | null;
    file_otf?: string | null;
    file_woff?: string | null;
    file_woff2?: string | null;
    created_at: string;
    updated_at?: string | null;
}

export interface BrandingPalette {
    id: string;
    district_id: string;
    name: string;
    role: string;
    colors: string[]; // HEX values
    created_at: string;
    updated_at?: string | null;
}

export type FontRole =
    | "body"
    | "header1"
    | "header2"
    | "subheader"
    | "logo"
    // legacy/compat
    // | "heading"
    | "display";
export type FontAvailability = "system" | "google" | "licensed";

export interface BrandingTypography {
    id: string;
    district_id: string;
    font_name: string;
    role?: FontRole | null;
    availability?: FontAvailability | null;
    weights?: string[] | null;
    download_url?: string | null;
    heading_font?: string | null;
    body_font?: string | null;
    accent_font?: string | null;
    usage_rules?: string | null;
    created_at: string;
    updated_at?: string | null;
}

export interface BrandingSchool {
    id: string;
    district_id: string;
    school_name: string;
    mascot?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface BrandingSummary {
    logos: BrandingLogo[];
    patterns: BrandingPattern[];
    fonts: BrandingFont[];
    palettes: BrandingPalette[];
    typography: BrandingTypography[];
    schools: BrandingSchool[];
}
