export type PeopleParseQuality = "good" | "mixed" | "poor" | "unknown";

export type NonprofitRow = {
    entity_id: string;
    entity_name: string;
    ein: string | null;
    city: string | null;
    state: string | null;
    latest_tax_year: number | null;
    total_revenue: number | null;
    total_expenses: number | null;
    total_assets_end: number | null;
    total_liabilities_end: number | null;
    net_assets_end: number | null;
    return_id: string | null;
    has_narrative: boolean;
    people_count: number | null;
    people_parse_quality: PeopleParseQuality;
};

export type IrsOrganization = {
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

export type IrsReturn = {
    id: string;
    tax_year: number;
    tax_period_start: string | null;
    tax_period_end: string | null;
    return_type: string | null;
    filed_on: string | null;
};

export type IrsNarrative = {
    id: string;
    return_id: string;
    section: string;
    label: string | null;
    raw_text: string;
    ai_summary: string | null;
};

export type IrsPerson = {
    id: string;
    return_id: string;
    role: string;
    name: string;
    title: string | null;
    average_hours_per_week: number | null;
    reportable_compensation: number | null;
    other_compensation: number | null;
    is_current: boolean | null;
    is_flagged: boolean;
};

export type FinancialTrendRow = {
    return_id: string;
    tax_year: number | null;
    total_revenue: number | null;
    total_expenses: number | null;
    total_assets_end: number | null;
    total_liabilities_end: number | null;
    net_assets_end: number | null;
};

export type NonprofitDetail = {
    organization: IrsOrganization | null;
    returns: IrsReturn[];
    narratives: IrsNarrative[];
    people: IrsPerson[];
    financials_by_year: FinancialTrendRow[];
};

export type SuperintendentDashboardResponse = {
    nonprofits: NonprofitRow[];
    detailsByEntityId: Record<string, NonprofitDetail>;
};

export type ScopeSummary = {
    nonprofits_in_scope: number;
    nonprofits_active: number;
    nonprofits_candidate: number;
};

export type SortKey = "revenue" | "assets" | "net_assets";

export type SortDirection = "asc" | "desc";
