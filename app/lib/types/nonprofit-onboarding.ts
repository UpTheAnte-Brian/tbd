import type { Database } from "@/database.types";
import type { OnboardingSection } from "@/app/lib/nonprofit-onboarding";

export type CreateNonprofitRequest = {
  name: string;
  org_type: Database["public"]["Enums"]["org_type"];
  ein?: string | null;
  website_url?: string | null;
  mission_statement?: string | null;
  district_entity_id: string;
  scope_id?: string | null;
};

export type CreateNonprofitResponse = {
  entity_id: string;
  nonprofit_id: string;
  slug: string;
};

export type OnboardingProgressRow =
  Database["public"]["Tables"]["entity_onboarding_progress"]["Row"];

export type EntityFieldOverrideRow =
  Database["public"]["Tables"]["entity_field_overrides"]["Row"];

export type EntityBasics = Pick<
  Database["public"]["Tables"]["entities"]["Row"],
  "id" | "name" | "slug" | "active" | "entity_type"
>;

export type NonprofitRow =
  Database["public"]["Tables"]["nonprofits"]["Row"];

export type ScopeReadyRow =
  Database["public"]["Views"]["superintendent_scope_nonprofits_ready"]["Row"];

export type IrsEntityLinkRow = Pick<
  Database["irs"]["Tables"]["entity_links"]["Row"],
  "ein" | "match_type" | "confidence" | "created_at" | "notes"
>;

export type IrsOrganizationSnapshot = {
  ein: string;
  legal_name: string | null;
  website: string | null;
};

export type IrsLatestReturnSnapshot = Pick<
  Database["irs"]["Views"]["latest_returns"]["Row"],
  "id" | "ein" | "tax_year" | "return_type" | "filed_on" | "updated_at"
>;

export type IrsLatestFinancialsSnapshot = Pick<
  Database["irs"]["Views"]["latest_financials"]["Row"],
  | "ein"
  | "return_id"
  | "tax_year"
  | "return_type"
  | "total_revenue"
  | "total_expenses"
  | "total_assets_begin"
  | "total_assets_end"
  | "net_assets_begin"
  | "net_assets_end"
  | "excess_or_deficit"
  | "updated_at"
>;

export type IrsReturnPersonSnapshot = Pick<
  Database["irs"]["Tables"]["return_people"]["Row"],
  "id" | "name" | "title" | "role" | "is_current"
>;

export type EntityPersonClaimRow =
  Database["public"]["Tables"]["entity_person_claims"]["Row"];

export type DocumentSummary = Pick<
  Database["public"]["Tables"]["documents"]["Row"],
  | "id"
  | "title"
  | "document_type"
  | "status"
  | "visibility"
  | "current_version_id"
  | "created_at"
  | "updated_at"
  | "tax_year"
>;

export type NonprofitOnboardingData = {
  entity: EntityBasics;
  nonprofit: NonprofitRow | null;
  onboarding_progress: OnboardingProgressRow[];
  hasIrsLink: boolean;
  linkedEin: string | null;
  irs_link: IrsEntityLinkRow | null;
  irs_organization: IrsOrganizationSnapshot | null;
  irs_latest_return: IrsLatestReturnSnapshot | null;
  irs_financials: IrsLatestFinancialsSnapshot | null;
  irs_people: IrsReturnPersonSnapshot[];
  overrides: EntityFieldOverrideRow[];
  person_claims: EntityPersonClaimRow[];
  documents: DocumentSummary[];
  scope: ScopeReadyRow | null;
};

export type UpdateOnboardingProgressRequest = {
  section: OnboardingSection;
  status: "pending" | "in_progress" | "complete" | "skipped";
};

export type UpdateOnboardingIdentityRequest = {
  name?: string | null;
  ein?: string | null;
  website_url?: string | null;
  mission_statement?: string | null;
};

export type UpsertOverrideRequest = {
  namespace: string;
  field_key: string;
  value: unknown;
  source?: string;
  confidence?: number;
};
