export type OrgType =
    | "district_foundation"
    | "up_the_ante"
    | "external_charity";

export interface Nonprofit {
    id: string;
    entity_id?: string | null;
    name: string;
    ein: string | null;
    logo_url: string | null;
    website_url: string | null;
    mission_statement: string | null;

    org_type: OrgType;

    district_id: string | null;

    address: string | null;
    contact_email: string | null;
    contact_phone: string | null;

    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface FoundationMetadata {
    id: string; // FK to nonprofits.id
    director: string | null;
    endowment_amount: number | null;
    grantmaking_focus: string | null;
    additional_info: string | null; // optional JSON/text
    created_at: string;
    updated_at: string;
}

export interface DistrictFoundation extends Nonprofit {
    org_type: "district_foundation";
    district_id: string;
    metadata?: FoundationMetadata;
}
