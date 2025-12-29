import type { Feature, MultiPolygon, Polygon } from "geojson";

// ----------------------------
// Entity + User base types
// ----------------------------
export const ENTITY_TYPES = ["district", "nonprofit", "business"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];
export type EntityUserRole = "admin" | "editor" | "viewer" | "employee";

export interface EntityUser {
    id: string;
    entity_type?: EntityType;
    entity_id: string;
    user_id: string;
    role: EntityUserRole;
    status?: "active" | "invited" | "removed" | null;
    created_at?: string | null;
    updated_at?: string | null;
    profile?: ProfilePreview | null;
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
    entity_users?: EntityUser[];
    global_role: string | null;
    address: string | null;
    phone_number: string | null;
}

export type ProfilePreview = Partial<Profile> & { id: string };

// Optional UI helper for role selection widgets
export const RoleOptions = {
    business: [] as const,
    district: [] as const,
};

// ----------------------------
// District domain
// ----------------------------
export interface DistrictProperties {
    sdorgid: string; // "10004000000.0"
    shortname: string; // "McGregor"
    prefname: string; // "McGregor Public School District"
    sdnumber: string; // "0004"
    web_url: string; // "https://www.mcgregor.k12.mn.us/"
    acres?: number | string | null; // "514149.7135"
    formid?: string | null; // "0004-01"
    sdtype?: string | null; // "01"
    sqmiles?: number | string | null; // "803.3552"
    shape_area?: number | string | null; // "2080689853.05"
    shape_leng?: number | string | null; // "327108.90135599999"
    centroid_lat?: number | null;
    centroid_lng?: number | null;
}

export interface DistrictFeature
    extends Feature<Polygon | MultiPolygon, DistrictProperties> {
    id: string; // UUID from Supabase
    entity_id?: string; // UUID from entities table
    properties: DistrictProperties;
    users?: EntityUser[]; // optional list of related users
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

// ----------------------------
// Business + campaigns
// ----------------------------
export type BusinessStatus =
    | "pending"
    | "active"
    | "inactive"
    | "verified"
    | "rejected";

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

export type CampaignType = "round_up" | "percent" | "flat";
export type CampaignStatus = "pending" | "scheduled" | "active" | "ended";

export interface Campaign {
    id: string;
    business_id?: string;
    district_id?: string;
    campaign_type: CampaignType;
    status: "pending" | "active" | "ended";
    created_at: string;
    updated_at: string;
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

// ----------------------------
// Branding types
// ----------------------------
export interface BrandingLogo {
    id: string;
    entity_id: string;
    entity_type: EntityType;
    category: BrandingLogoCategory;
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
    entity_id: string;
    entity_type: EntityType;
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
    entity_id: string;
    entity_type: EntityType;
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

export const BRANDING_LOGO_CATEGORIES = [
    "primary_logo",
    "secondary_logo",
    "icon",
    "wordmark",
    "seal",
    "co_brand",
    "event",
    "program",
    "athletics_primary",
    "athletics_icon",
    "athletics_wordmark",
    "community_ed",
    "team_logo",
    "brand_pattern",
    "font",
] as const;

export type BrandingLogoCategory =
    | (typeof BRANDING_LOGO_CATEGORIES)[number]
    | "district_primary"
    | "district_secondary";

export const BRANDING_LOGO_CATEGORY_LABELS: Record<
    BrandingLogoCategory,
    string
> = {
    primary_logo: "Primary Logo",
    secondary_logo: "Secondary Logo",
    icon: "Icon",
    wordmark: "Wordmark",
    seal: "Seal",
    co_brand: "Co-branded",
    event: "Event",
    program: "Program",
    athletics_primary: "Athletics Primary",
    athletics_icon: "Athletics Icon",
    athletics_wordmark: "Athletics Wordmark",
    community_ed: "Community Ed",
    team_logo: "Team Logo",
    brand_pattern: "Pattern",
    font: "Font",
    district_primary: "Primary Logo",
    district_secondary: "Secondary Logo",
};

export interface BrandingPalette {
    id: string;
    entity_id: string;
    entity_type: EntityType;
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
    | "display";
export type FontAvailability = "system" | "google" | "licensed";

export interface BrandingTypography {
    id: string;
    entity_id: string;
    entity_type: EntityType;
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
    entity_id: string;
    entity_type: EntityType;
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
    schools?: BrandingSchool[];
}

// ----------------------------
// Map + utility types
// ----------------------------
export type LatLngLiteral = google.maps.LatLngLiteral;

export type MarkerType = {
    id: string;
    location: google.maps.LatLngLiteral;
    name: string;
    phone_number: string;
    website: string;
};

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

// ----------------------------
// Payments / receipts
// ----------------------------
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

// ----------------------------
// Menu / navigation helpers
// ----------------------------
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
