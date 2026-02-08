import type { OrgType } from "@/app/lib/types/nonprofits";

export type ScopeTier = "registry_only" | "disclosure_grade" | "institutional";
export type ScopeStatus = "candidate" | "active" | "archived";

export type AdminScopeRow = {
  id: string;
  district_entity_id: string | null;
  entity_id: string | null;
  ein: string;
  label: string | null;
  org_type: OrgType | null;
  tier: ScopeTier;
  status: ScopeStatus;
  created_at: string;
  updated_at: string;
};

export type OnboardingQueueRow = {
  district_entity_id: string | null;
  label: string | null;
  ein: string | null;
  entity_id: string | null;
  status: ScopeStatus | null;
  tier: ScopeTier | null;
  org_type: OrgType | null;
  has_entity: boolean;
  has_irs_org: boolean;
  has_returns: boolean;
};

export type AdminIrsOrganization = {
  ein: string;
  legal_name: string;
  city: string | null;
  state: string | null;
  website: string | null;
  ruling_year: number | null;
  subsection_code: string | null;
  foundation_code: string | null;
  deductibility_code: string | null;
};

export type AdminSearchResult = {
  ein: string;
  legal_name: string;
  city: string | null;
  state: string | null;
  website: string | null;
  ruling_year: number | null;
  scope: Pick<AdminScopeRow, "id" | "tier" | "status" | "label"> | null;
};

export type AdminNonprofitReview = {
  ein: string;
  organization: AdminIrsOrganization | null;
  latest_return: {
    id: string;
    tax_year: number;
    return_type: string | null;
    filed_on: string | null;
  } | null;
  latest_financials: {
    total_revenue: number | null;
    total_expenses: number | null;
    total_assets_end: number | null;
    total_liabilities_end: number | null;
    net_assets_end: number | null;
  } | null;
  narratives_count: number;
  people_count: number | null;
  people_parse_quality: "good" | "mixed" | "poor" | "unknown";
  missing_filings: boolean;
  scope: AdminScopeRow | null;
  scope_id: string | null;
  entity: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export type AdminCreateEntityResponse = {
  entity: {
    id: string;
    name: string;
    slug: string;
  } | null;
  created: boolean;
  linked: boolean;
};
