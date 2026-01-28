import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";

import type {
    FinancialTrendRow,
    IrsNarrative,
    IrsOrganization,
    IrsPerson,
    IrsReturn,
    NonprofitDetail,
    NonprofitRow,
    PeopleParseQuality,
    SuperintendentDashboardResponse,
} from "@/app/components/districts/superintendent/types";

type IrsTable<Row> = {
    Row: Row;
    Insert: Partial<Row>;
    Update: Partial<Row>;
    Relationships: [];
};

type IrsOrganizationRow = {
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

type IrsReturnRow = {
    id: string;
    ein: string;
    return_type: string;
    tax_year: number;
    tax_period_start: string | null;
    tax_period_end: string | null;
    filed_on: string | null;
    is_amended: boolean | null;
    is_terminated: boolean | null;
    principal_officer_name: string | null;
};

type IrsFinancialRow = {
    return_id: string;
    total_revenue: number | null;
    total_expenses: number | null;
    total_assets_end: number | null;
    total_liabilities_end: number | null;
    net_assets_end: number | null;
};

type IrsNarrativeRow = {
    id: string;
    return_id: string;
    section: string;
    label: string | null;
    raw_text: string;
    ai_summary: string | null;
};

type IrsPersonRow = {
    id: string;
    return_id: string;
    role: string;
    name: string;
    title: string | null;
    average_hours_per_week: number | null;
    reportable_compensation: number | null;
    other_compensation: number | null;
    is_current: boolean | null;
};

type IrsSchema = {
    Tables: {
        organizations: IrsTable<IrsOrganizationRow>;
        returns: IrsTable<IrsReturnRow>;
        return_financials: IrsTable<IrsFinancialRow>;
        return_people: IrsTable<IrsPersonRow>;
        return_narratives: IrsTable<IrsNarrativeRow>;
    };
    Views: {
        latest_returns: {
            Row: IrsReturnRow;
            Relationships: [];
        };
        latest_financials: {
            Row: IrsFinancialRow & {
                ein: string;
                return_type: string;
                tax_year: number;
            };
            Relationships: [];
        };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
};

type IrsDatabase = Database & { irs: IrsSchema };

type SuperintendentScopeReadyRow =
    IrsDatabase["public"]["Views"]["superintendent_scope_nonprofits_ready"]["Row"];

const JUNK_TEXT_HINTS = [
    "internal revenue",
    "service",
    "section",
    "part",
    "schedule",
    "prior year",
    "current year",
    "form 990",
];

function getServiceRoleSupabaseClient(): SupabaseClient<IrsDatabase> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.SUPABASE_PROJECT_URL;

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error(
            "Missing Supabase env vars for superintendent dashboard. Expected NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
        );
    }

    return createClient<IrsDatabase>(url, serviceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

function toNumber(value: unknown): number | null {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function normalizeEin(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function looksOcrGarbage(text: string): boolean {
    const compact = text.replace(/\s+/g, "");
    if (!compact) return false;
    if (compact.length > 40 && !text.includes(" ")) return true;
    const letters = compact.match(/[a-z]/gi)?.length ?? 0;
    if (letters === 0) return true;
    const vowels = compact.match(/[aeiou]/gi)?.length ?? 0;
    const punctuation = compact.match(/[^a-z0-9]/gi)?.length ?? 0;
    const punctRatio = punctuation / compact.length;
    const vowelRatio = vowels / letters;
    return punctRatio > 0.35 || (letters > 10 && vowelRatio < 0.2);
}

function isLikelyJunkPerson(person: IrsPersonRow): boolean {
    const name = person.name?.trim() ?? "";
    const title = person.title?.trim() ?? "";
    const combined = `${name} ${title}`.trim().toLowerCase();
    if (!combined) return true;
    if (JUNK_TEXT_HINTS.some((hint) => combined.includes(hint))) return true;
    return looksOcrGarbage(name) || looksOcrGarbage(title);
}

function assessPeopleParseQuality(rows: IrsPersonRow[]): PeopleParseQuality {
    const total = rows.length;
    if (total === 0) return "unknown";
    const junkCount = rows.filter(isLikelyJunkPerson).length;
    const plausibleCount = total - junkCount;
    const junkRatio = junkCount / total;

    if (plausibleCount >= 3 && junkRatio < 0.2) return "good";
    if (plausibleCount < 2 || junkRatio > 0.6) return "poor";
    if (plausibleCount >= 2 && junkRatio >= 0.2 && junkRatio <= 0.6) {
        return "mixed";
    }
    return "mixed";
}

function buildNonprofitRow(params: {
    scopeRow: SuperintendentScopeReadyRow;
    ein: string | null;
    organization: IrsOrganizationRow | null;
    latestReturn: IrsReturnRow | null;
    latestFinancials: IrsFinancialRow | null;
    latestNarratives: IrsNarrativeRow[];
    latestPeople: IrsPersonRow[];
}): NonprofitRow {
    const {
        scopeRow,
        ein,
        organization,
        latestReturn,
        latestFinancials,
        latestNarratives,
        latestPeople,
    } = params;
    const displayName =
        scopeRow.label ??
        organization?.legal_name ??
        scopeRow.ein ??
        "Unknown nonprofit";
    const latestTaxYear = latestReturn?.tax_year ?? null;
    const peopleCount = latestReturn ? latestPeople.length : null;
    const peopleQuality = latestReturn
        ? assessPeopleParseQuality(latestPeople)
        : "unknown";

    return {
        entity_id: String(scopeRow.entity_id ?? scopeRow.id),
        entity_name: displayName,
        ein,
        city: organization?.city ?? null,
        state: organization?.state ?? null,
        latest_tax_year: latestTaxYear,
        total_revenue: toNumber(latestFinancials?.total_revenue),
        total_expenses: toNumber(latestFinancials?.total_expenses),
        total_assets_end: toNumber(latestFinancials?.total_assets_end),
        total_liabilities_end: toNumber(
            latestFinancials?.total_liabilities_end,
        ),
        net_assets_end: toNumber(latestFinancials?.net_assets_end),
        return_id: latestReturn?.id ?? null,
        has_narrative: latestNarratives.length > 0,
        people_count: peopleCount,
        people_parse_quality: peopleQuality,
    };
}

function mapOrganization(org: IrsOrganizationRow): IrsOrganization {
    return {
        ein: org.ein,
        legal_name: org.legal_name,
        city: org.city,
        state: org.state,
        website: org.website,
        ruling_year: org.ruling_year,
        subsection_code: org.subsection_code,
        foundation_code: org.foundation_code,
        deductibility_code: org.deductibility_code,
    };
}

function mapReturn(row: IrsReturnRow): IrsReturn {
    return {
        id: row.id,
        tax_year: row.tax_year,
        tax_period_start: row.tax_period_start,
        tax_period_end: row.tax_period_end,
        return_type: row.return_type,
        filed_on: row.filed_on,
    };
}

function mapNarrative(row: IrsNarrativeRow): IrsNarrative {
    return {
        id: row.id,
        return_id: row.return_id,
        section: row.section,
        label: row.label,
        raw_text: row.raw_text,
        ai_summary: row.ai_summary,
    };
}

function mapPerson(row: IrsPersonRow): IrsPerson {
    return {
        id: row.id,
        return_id: row.return_id,
        role: row.role,
        name: row.name,
        title: row.title,
        average_hours_per_week: toNumber(row.average_hours_per_week),
        reportable_compensation: toNumber(row.reportable_compensation),
        other_compensation: toNumber(row.other_compensation),
        is_current: row.is_current,
        is_flagged: isLikelyJunkPerson(row),
    };
}

function mapFinancials(
    row: IrsFinancialRow,
    taxYear: number | null,
): FinancialTrendRow {
    return {
        return_id: row.return_id,
        tax_year: taxYear,
        total_revenue: toNumber(row.total_revenue),
        total_expenses: toNumber(row.total_expenses),
        total_assets_end: toNumber(row.total_assets_end),
        total_liabilities_end: toNumber(row.total_liabilities_end),
        net_assets_end: toNumber(row.net_assets_end),
    };
}

export async function getSuperintendentDashboardDTO(
    districtEntityId?: string | null,
): Promise<SuperintendentDashboardResponse> {
    // For v1 (read-only, not yet tied to an entity/user), use a service-role client
    // so we can read across entities + IRS schema without requiring a logged-in session.
    const supabase = getServiceRoleSupabaseClient();
    const irs = (supabase as unknown as SupabaseClient<IrsDatabase>).schema(
        "irs",
    );

    let scopeQuery = supabase
        .from("superintendent_scope_nonprofits_ready")
        .select(
            "id, district_entity_id, entity_id, ein, label, tier, status, created_at, updated_at, has_entity, has_irs_link, has_returns, is_ready",
        )
        .eq("is_ready", true);

    if (districtEntityId) {
        scopeQuery = scopeQuery.eq("district_entity_id", districtEntityId);
    }

    const { data: scopeRows, error: scopeError } = await scopeQuery;

    if (scopeError) {
        throw new Error(scopeError.message);
    }

    const scopedRows = scopeRows ?? [];

    if (!scopedRows || scopedRows.length === 0) {
        return { nonprofits: [], detailsByEntityId: {} };
    }

    const scopeEins = scopedRows
        .map((row) => normalizeEin(row.ein))
        .filter((ein): ein is string => Boolean(ein));

    const uniqueEins = Array.from(new Set(scopeEins));

    const organizationsByEin = new Map<string, IrsOrganizationRow>();
    const returnsByEin = new Map<string, IrsReturnRow[]>();
    const latestReturnByEin = new Map<string, IrsReturnRow>();
    const financialsByReturnId = new Map<string, IrsFinancialRow>();
    const narrativesByReturnId = new Map<string, IrsNarrativeRow[]>();
    const peopleByReturnId = new Map<string, IrsPersonRow[]>();

    if (uniqueEins.length > 0) {
        const { data: organizations, error: orgError } = await irs
            .from("organizations")
            .select(
                "ein, legal_name, city, state, website, ruling_year, subsection_code, foundation_code, deductibility_code",
            )
            .in("ein", uniqueEins);

        if (orgError) {
            throw new Error(orgError.message);
        }

        (organizations ?? []).forEach((row) => {
            organizationsByEin.set(row.ein, row);
        });

        const { data: returns, error: returnsError } = await irs
            .from("returns")
            .select(
                "id, ein, return_type, tax_year, tax_period_start, tax_period_end, filed_on, is_amended, is_terminated, principal_officer_name",
            )
            .in("ein", uniqueEins)
            .order("tax_year", { ascending: false });

        if (returnsError) {
            throw new Error(returnsError.message);
        }

        (returns ?? []).forEach((row) => {
            const list = returnsByEin.get(row.ein) ?? [];
            list.push(row);
            returnsByEin.set(row.ein, list);

            const current = latestReturnByEin.get(row.ein);
            if (!current || row.tax_year > current.tax_year) {
                latestReturnByEin.set(row.ein, row);
            }
        });

        returnsByEin.forEach((list, key) => {
            list.sort((a, b) => b.tax_year - a.tax_year);
            returnsByEin.set(key, list);
        });

        const allReturnIds = (returns ?? []).map((row) => row.id);

        if (allReturnIds.length > 0) {
            const { data: financials, error: financialsError } = await irs
                .from("return_financials")
                .select(
                    "return_id, total_revenue, total_expenses, total_assets_end, total_liabilities_end, net_assets_end",
                )
                .in("return_id", allReturnIds);

            if (financialsError) {
                throw new Error(financialsError.message);
            }

            (financials ?? []).forEach((row) => {
                financialsByReturnId.set(row.return_id, row);
            });

            const { data: narratives, error: narrativesError } = await irs
                .from("return_narratives")
                .select("id, return_id, section, label, raw_text, ai_summary")
                .in("return_id", allReturnIds);

            if (narrativesError) {
                throw new Error(narrativesError.message);
            }

            (narratives ?? []).forEach((row) => {
                const list = narrativesByReturnId.get(row.return_id) ?? [];
                list.push(row);
                narrativesByReturnId.set(row.return_id, list);
            });

            const { data: people, error: peopleError } = await irs
                .from("return_people")
                .select(
                    "id, return_id, role, name, title, average_hours_per_week, reportable_compensation, other_compensation, is_current",
                )
                .in("return_id", allReturnIds);

            if (peopleError) {
                throw new Error(peopleError.message);
            }

            (people ?? []).forEach((row) => {
                const list = peopleByReturnId.get(row.return_id) ?? [];
                list.push(row);
                peopleByReturnId.set(row.return_id, list);
            });
        }
    }

    const detailsByEntityId: Record<string, NonprofitDetail> = {};
    const nonprofits: NonprofitRow[] = scopedRows.map((scopeRow) => {
        const ein = normalizeEin(scopeRow.ein);
        const organization = ein ? organizationsByEin.get(ein) ?? null : null;
        const returnsForEin = ein ? returnsByEin.get(ein) ?? [] : [];
        const latestReturn = ein ? latestReturnByEin.get(ein) ?? null : null;
        const latestReturnId = latestReturn?.id ?? null;
        const latestFinancials = latestReturnId
            ? financialsByReturnId.get(latestReturnId) ?? null
            : null;
        const latestNarratives = latestReturnId
            ? narrativesByReturnId.get(latestReturnId) ?? []
            : [];
        const latestPeople = latestReturnId
            ? peopleByReturnId.get(latestReturnId) ?? []
            : [];

        const mappedReturns = returnsForEin.map(mapReturn);
        const mappedNarratives = latestNarratives.map(mapNarrative);
        const mappedPeople = latestPeople.map(mapPerson);
        const mappedFinancials = returnsForEin
            .map((returnRow) => {
                const financials = financialsByReturnId.get(returnRow.id);
                if (!financials) return null;
                return mapFinancials(financials, returnRow.tax_year ?? null);
            })
            .filter((row): row is FinancialTrendRow => Boolean(row));

        const entityId = String(scopeRow.entity_id ?? scopeRow.id);

        detailsByEntityId[entityId] = {
            organization: organization ? mapOrganization(organization) : null,
            returns: mappedReturns,
            narratives: mappedNarratives,
            people: mappedPeople,
            financials_by_year: mappedFinancials,
        };

        return buildNonprofitRow({
            scopeRow,
            ein,
            organization,
            latestReturn,
            latestFinancials,
            latestNarratives,
            latestPeople,
        });
    });

    return { nonprofits, detailsByEntityId };
}
