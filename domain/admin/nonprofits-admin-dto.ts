import "server-only";

import type { Database } from "@/database.types";
import {
  createIrsAdminClient,
  type IrsPostgrestClient,
  supabaseAdmin,
} from "@/utils/supabase/service-worker";
import type {
  AdminCreateEntityResponse,
  AdminNonprofitReview,
  AdminScopeRow,
  AdminSearchResult,
  ScopeStatus,
  ScopeTier,
} from "@/app/admin/nonprofits/types";
import type { PeopleParseQuality } from "@/app/components/districts/superintendent/types";

type IrsOrganizationRow = Database["irs"]["Tables"]["organizations"]["Row"];
type IrsFinancialRow = Database["irs"]["Tables"]["return_financials"]["Row"];
type IrsPersonRow = Database["irs"]["Tables"]["return_people"]["Row"];
type SuperintendentScopeRow =
  Database["public"]["Tables"]["superintendent_scope_nonprofits"]["Row"];
type IrsOrganizationSelect = Pick<
  IrsOrganizationRow,
  | "ein"
  | "legal_name"
  | "city"
  | "state"
  | "website"
  | "ruling_year"
  | "subsection_code"
  | "foundation_code"
  | "deductibility_code"
>;
type IrsFinancialSelect = Pick<
  IrsFinancialRow,
  | "return_id"
  | "total_revenue"
  | "total_expenses"
  | "total_assets_end"
  | "total_liabilities_end"
  | "net_assets_end"
>;
type IrsPersonSelect = Pick<
  IrsPersonRow,
  | "id"
  | "return_id"
  | "role"
  | "name"
  | "title"
  | "average_hours_per_week"
  | "reportable_compensation"
  | "other_compensation"
  | "is_current"
>;
type OrgType = Database["public"]["Enums"]["org_type"];

type PostgrestErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

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

const SCOPE_TIERS: ScopeTier[] = [
  "registry_only",
  "disclosure_grade",
  "institutional",
];

const SCOPE_STATUSES: ScopeStatus[] = ["candidate", "active", "archived"];
const DISTRICT_FOUNDATION_CONSTRAINT =
  "ssn_one_district_foundation_per_district";

function isDistrictFoundationConstraint(error: PostgrestErrorLike | null) {
  if (!error || error.code !== "23505") return false;
  return [
    error.message,
    error.details,
    error.hint,
  ].some((text) => text?.includes(DISTRICT_FOUNDATION_CONSTRAINT));
}

function getIrsClient(): IrsPostgrestClient {
  return createIrsAdminClient();
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

function normalizeEinInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length === 9 ? digits : null;
}

async function resolveEntityIdForEin(
  ein: string,
  scopeEntityId?: string | null,
): Promise<string | null> {
  if (scopeEntityId) return scopeEntityId;

  const irs: IrsPostgrestClient = getIrsClient();
  const { data: link, error: linkError } = await irs
    .from("entity_links")
    .select("entity_id")
    .eq("ein", ein)
    .maybeSingle();

  if (linkError) {
    throw new Error(linkError.message);
  }

  if (link?.entity_id) {
    return String(link.entity_id);
  }

  const { data: entity, error: entityError } = await supabaseAdmin
    .from("entities")
    .select("id")
    .contains("external_ids", { ein })
    .maybeSingle();

  if (entityError) {
    throw new Error(entityError.message);
  }

  return entity?.id ? String(entity.id) : null;
}

async function syncNonprofitOrgType(params: {
  ein: string;
  org_type: OrgType;
  scopeLabel?: string | null;
  scopeEntityId?: string | null;
}) {
  const { ein, org_type, scopeLabel, scopeEntityId } = params;
  const entityId = await resolveEntityIdForEin(ein, scopeEntityId);
  if (!entityId) return;

  let name = scopeLabel?.trim() ?? "";

  if (!name) {
    const irs: IrsPostgrestClient = getIrsClient();
    const { data: org, error: orgError } = await irs
      .from("organizations")
      .select("legal_name")
      .eq("ein", ein)
      .maybeSingle();

    if (orgError) {
      throw new Error(orgError.message);
    }

    name = org?.legal_name?.trim() ?? "";
  }

  if (!name) {
    name = `Nonprofit ${ein}`;
  }

  const { error } = await supabaseAdmin
    .from("nonprofits")
    .upsert(
      {
        entity_id: entityId,
        name,
        ein,
        org_type,
      },
      { onConflict: "ein" },
    );

  if (error) {
    throw new Error(error.message);
  }
}

async function fetchScopeOrgType(
  ein: string,
  scopeId?: string | null,
): Promise<OrgType | null> {
  let query = supabaseAdmin
    .from("superintendent_scope_nonprofits")
    .select("org_type")
    .eq("ein", ein);

  if (scopeId) {
    query = query.eq("id", scopeId);
  }

  if (!scopeId) {
    query = query.order("updated_at", { ascending: false }).limit(1);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.org_type ?? null;
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

function isLikelyJunkPerson(person: IrsPersonSelect): boolean {
  const name = person.name?.trim() ?? "";
  const title = person.title?.trim() ?? "";
  const combined = `${name} ${title}`.trim().toLowerCase();
  if (!combined) return true;
  if (JUNK_TEXT_HINTS.some((hint) => combined.includes(hint))) return true;
  return looksOcrGarbage(name) || looksOcrGarbage(title);
}

function assessPeopleParseQuality(rows: IrsPersonSelect[]): PeopleParseQuality {
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

function slugify(value: string): string {
  const cleaned = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\u0000-\u007F]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return cleaned || "nonprofit";
}

function coerceTier(value: unknown): ScopeTier {
  return SCOPE_TIERS.includes(value as ScopeTier)
    ? (value as ScopeTier)
    : "registry_only";
}

function coerceStatus(value: unknown): ScopeStatus {
  return SCOPE_STATUSES.includes(value as ScopeStatus)
    ? (value as ScopeStatus)
    : "candidate";
}

function mapScopeRow(
  row: SuperintendentScopeRow | null,
): AdminScopeRow | null {
  if (!row) return null;
  return {
    id: row.id,
    district_entity_id: row.district_entity_id ?? null,
    entity_id: row.entity_id ?? null,
    ein: row.ein,
    label: row.label ?? null,
    org_type: row.org_type ?? null,
    tier: coerceTier(row.tier),
    status: coerceStatus(row.status),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function fetchScopeRows(
  eins: string[],
): Promise<Map<string, AdminScopeRow>> {
  const map = new Map<string, AdminScopeRow>();
  if (eins.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("superintendent_scope_nonprofits")
    .select(
      "id, district_entity_id, entity_id, ein, label, org_type, tier, status, created_at, updated_at",
    )
    .in("ein", eins);

  if (error) {
    throw new Error(error.message);
  }

  (data ?? []).forEach((row) => {
    if (!row?.ein) return;
    map.set(row.ein, {
      id: String(row.id),
      district_entity_id: row.district_entity_id ?? null,
      entity_id: row.entity_id ?? null,
      ein: row.ein,
      label: row.label ?? null,
      org_type: row.org_type ?? null,
      tier: coerceTier(row.tier),
      status: coerceStatus(row.status),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    });
  });

  return map;
}

export async function searchNonprofits(
  query: string,
): Promise<AdminSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const irs: IrsPostgrestClient = getIrsClient();
  const byEinMap = new Map<string, IrsOrganizationSelect>();

  const maybeEin = normalizeEinInput(trimmed);
  const einMatches = maybeEin && /^\d{9}$/.test(maybeEin) ? [maybeEin] : [];

  if (einMatches.length > 0) {
    const { data, error } = await irs
      .from("organizations")
      .select(
        "ein, legal_name, city, state, website, ruling_year, subsection_code, foundation_code, deductibility_code",
      )
      .in("ein", einMatches);

    if (error) {
      throw new Error(error.message);
    }

    (data ?? []).forEach((row) => {
      byEinMap.set(row.ein, row);
    });
  }

  const { data: nameMatches, error: nameError } = await irs
    .from("organizations")
    .select(
      "ein, legal_name, city, state, website, ruling_year, subsection_code, foundation_code, deductibility_code",
    )
    .ilike("legal_name", `%${trimmed}%`)
    .limit(50);

  if (nameError) {
    throw new Error(nameError.message);
  }

  (nameMatches ?? []).forEach((row) => {
    if (!byEinMap.has(row.ein)) {
      byEinMap.set(row.ein, row);
    }
  });

  const eins = Array.from(byEinMap.keys());
  const scopeMap = await fetchScopeRows(eins);

  return eins
    .map((ein) => {
      const org = byEinMap.get(ein);
      if (!org) return null;
      const scope = scopeMap.get(ein) ?? null;
      return {
        ein: org.ein,
        legal_name: org.legal_name,
        city: org.city ?? null,
        state: org.state ?? null,
        website: org.website ?? null,
        ruling_year: org.ruling_year ?? null,
        scope: scope
          ? {
            id: scope.id,
            tier: scope.tier,
            status: scope.status,
            label: scope.label ?? null,
          }
          : null,
      };
    })
    .filter((row): row is AdminSearchResult => Boolean(row))
    .sort((a, b) => a.legal_name.localeCompare(b.legal_name));
}

export async function getNonprofitReview(
  ein: string,
): Promise<AdminNonprofitReview> {
  const normalizedEin = normalizeEinInput(ein);
  if (!normalizedEin) {
    throw new Error("Invalid EIN");
  }
  const irs: IrsPostgrestClient = getIrsClient();

  const { data: organization, error: orgError } = await irs
    .from("organizations")
    .select(
      "ein, legal_name, city, state, website, ruling_year, subsection_code, foundation_code, deductibility_code",
    )
    .eq("ein", normalizedEin)
    .maybeSingle();

  if (orgError) {
    throw new Error(orgError.message);
  }

  const { data: scopeRow, error: scopeError } = await supabaseAdmin
    .from("superintendent_scope_nonprofits")
    .select(
      "id, district_entity_id, entity_id, ein, label, tier, status, created_at, updated_at",
    )
    .eq("ein", normalizedEin)
    .maybeSingle();

  if (scopeError) {
    throw new Error(scopeError.message);
  }

  const { data: latestReturn, error: returnError } = await irs
    .from("latest_returns")
    .select("id, tax_year, return_type, filed_on")
    .eq("ein", normalizedEin)
    .order("tax_year", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (returnError) {
    throw new Error(returnError.message);
  }

  let latestFinancials: IrsFinancialSelect | null = null;
  let narrativesCount = 0;
  let peopleCount: number | null = null;
  let peopleParseQuality: PeopleParseQuality = "unknown";

  if (latestReturn?.id) {
    const { data: financials, error: financialsError } = await irs
      .from("return_financials")
      .select(
        "return_id, total_revenue, total_expenses, total_assets_end, total_liabilities_end, net_assets_end",
      )
      .eq("return_id", latestReturn.id)
      .maybeSingle();

    if (financialsError) {
      throw new Error(financialsError.message);
    }

    latestFinancials = financials ?? null;

    const { data: narratives, error: narrativesError } = await irs
      .from("return_narratives")
      .select("id, return_id")
      .eq("return_id", latestReturn.id);

    if (narrativesError) {
      throw new Error(narrativesError.message);
    }

    narrativesCount = narratives?.length ?? 0;

    const { data: people, error: peopleError } = await irs
      .from("return_people")
      .select(
        "id, return_id, role, name, title, average_hours_per_week, reportable_compensation, other_compensation, is_current",
      )
      .eq("return_id", latestReturn.id);

    if (peopleError) {
      throw new Error(peopleError.message);
    }

    const peopleRows = people ?? [];
    peopleCount = peopleRows.length;
    peopleParseQuality = assessPeopleParseQuality(peopleRows);
  }

  const { data: linkRow, error: linkError } = await irs
    .from("entity_links")
    .select("ein, entity_id")
    .eq("ein", normalizedEin)
    .maybeSingle();

  if (linkError) {
    throw new Error(linkError.message);
  }

  let entity: { id: string; name: string; slug: string } | null = null;
  if (linkRow?.entity_id) {
    const { data: entityRow, error: entityError } = await supabaseAdmin
      .from("entities")
      .select("id, name, slug")
      .eq("id", linkRow.entity_id)
      .maybeSingle();

    if (entityError) {
      throw new Error(entityError.message);
    }

    if (entityRow) {
      entity = {
        id: String(entityRow.id),
        name: String(entityRow.name),
        slug: String(entityRow.slug),
      };
    }
  }

  const currentYear = new Date().getFullYear();
  const missingFilings = !latestReturn?.tax_year ||
    latestReturn.tax_year < currentYear - 2;

  const mappedLatestReturn = latestReturn?.id && latestReturn.tax_year !== null
    ? {
      id: latestReturn.id,
      tax_year: latestReturn.tax_year,
      return_type: latestReturn.return_type ?? null,
      filed_on: latestReturn.filed_on ?? null,
    }
    : null;

  return {
    ein: normalizedEin,
    organization: organization
      ? {
        ein: organization.ein,
        legal_name: organization.legal_name,
        city: organization.city ?? null,
        state: organization.state ?? null,
        website: organization.website ?? null,
        ruling_year: organization.ruling_year ?? null,
        subsection_code: organization.subsection_code ?? null,
        foundation_code: organization.foundation_code ?? null,
        deductibility_code: organization.deductibility_code ?? null,
      }
      : null,
    latest_return: mappedLatestReturn,
    latest_financials: latestFinancials
      ? {
        total_revenue: toNumber(latestFinancials.total_revenue),
        total_expenses: toNumber(latestFinancials.total_expenses),
        total_assets_end: toNumber(latestFinancials.total_assets_end),
        total_liabilities_end: toNumber(latestFinancials.total_liabilities_end),
        net_assets_end: toNumber(latestFinancials.net_assets_end),
      }
      : null,
    narratives_count: narrativesCount,
    people_count: peopleCount,
    people_parse_quality: peopleParseQuality,
    missing_filings: missingFilings,
    scope: mapScopeRow(scopeRow as SuperintendentScopeRow | null),
    scope_id: scopeRow?.id ? String(scopeRow.id) : null,
    entity,
  };
}

export async function addScopeNonprofit(params: {
  district_entity_id: string;
  ein: string;
  label?: string | null;
  org_type?: OrgType;
  tier?: ScopeTier;
  status?: ScopeStatus;
}): Promise<AdminScopeRow> {
  const normalizedEin = normalizeEinInput(params.ein);
  if (!normalizedEin) {
    throw new Error("EIN is required");
  }

  const payload:
    Database["public"]["Tables"]["superintendent_scope_nonprofits"]["Insert"] =
      {
        district_entity_id: params.district_entity_id,
        ein: normalizedEin,
        label: params.label ?? undefined,
        org_type: params.org_type ?? undefined,
        tier: params.tier ?? "registry_only",
        status: params.status ?? "candidate",
      };

  const { data, error } = await supabaseAdmin
    .from("superintendent_scope_nonprofits")
    // EIN is only unique within a district now.
    .upsert(payload, { onConflict: "district_entity_id,ein" })
    .select(
      "id, district_entity_id, entity_id, ein, label, org_type, tier, status, created_at, updated_at",
    )
    .single();

  if (error) {
    if (isDistrictFoundationConstraint(error)) {
      throw new Error(
        "This district already has a District Foundation. Change the existing one first.",
      );
    }
    throw new Error(error.message);
  }

  if (params.org_type) {
    await syncNonprofitOrgType({
      ein: normalizedEin,
      org_type: params.org_type,
      scopeLabel: data.label ?? null,
      scopeEntityId: data.entity_id ?? null,
    });
  }

  return {
    id: String(data.id),
    district_entity_id: data.district_entity_id ?? null,
    entity_id: data.entity_id ?? null,
    ein: data.ein,
    label: data.label ?? null,
    org_type: data.org_type ?? null,
    tier: data.tier as ScopeTier,
    status: data.status as ScopeStatus,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

export async function getScopeNonprofitById(
  id: string,
): Promise<AdminScopeRow | null> {
  const { data, error } = await supabaseAdmin
    .from("superintendent_scope_nonprofits")
    .select(
      "id, district_entity_id, entity_id, ein, label, org_type, tier, status, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return mapScopeRow(data as SuperintendentScopeRow | null);
}

export async function backfillScopeNonprofitEntity(params: {
  scope_id: string;
  entity_id: string;
}): Promise<AdminScopeRow> {
  const { scope_id, entity_id } = params;
  if (!scope_id) throw new Error("scope_id is required");
  if (!entity_id) throw new Error("entity_id is required");

  const { data, error } = await supabaseAdmin
    .from("superintendent_scope_nonprofits")
    .update({ entity_id })
    .eq("id", scope_id)
    .select(
      "id, district_entity_id, entity_id, ein, label, org_type, tier, status, created_at, updated_at",
    )
    .single();

  if (error) throw new Error(error.message);
  return {
    id: String(data.id),
    district_entity_id: data.district_entity_id,
    entity_id: data.entity_id ?? null,
    ein: data.ein,
    label: data.label ?? null,
    org_type: data.org_type ?? null,
    tier: data.tier as ScopeTier,
    status: data.status as ScopeStatus,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

export async function updateScopeNonprofit(params: {
  district_entity_id: string;
  ein: string;
  tier?: ScopeTier;
  status?: ScopeStatus;
  label?: string | null;
  org_type?: OrgType;
}): Promise<AdminScopeRow> {
  const normalizedEin = normalizeEinInput(params.ein);
  if (!normalizedEin) {
    throw new Error("EIN is required");
  }

  // Build update payload (omit fields you don't want to change)
  const updates:
    Database["public"]["Tables"]["superintendent_scope_nonprofits"]["Update"] =
      {};

  if (params.tier !== undefined) updates.tier = params.tier;
  if (params.status !== undefined) updates.status = params.status;
  if (params.label !== undefined) updates.label = params.label; // allow null to clear
  if (params.org_type !== undefined) updates.org_type = params.org_type;

  // (Optional) avoid a no-op update
  if (
    params.tier === undefined &&
    params.status === undefined &&
    params.label === undefined &&
    params.org_type === undefined
  ) {
    throw new Error("No updates provided");
  }

  // Update and return the updated row
  const { data, error } = await supabaseAdmin
    .from("superintendent_scope_nonprofits")
    .update(updates)
    .eq("district_entity_id", params.district_entity_id)
    .eq("ein", normalizedEin)
    .select(
      "id, district_entity_id, entity_id, ein, label, org_type, tier, status, created_at, updated_at",
    )
    .single();

  if (error) {
    if (isDistrictFoundationConstraint(error)) {
      throw new Error(
        "This district already has a District Foundation. Change the existing one first.",
      );
    }
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Update failed: no data returned");
  }

  if (params.org_type !== undefined) {
    const nextOrgType = data.org_type ?? params.org_type;
    if (nextOrgType) {
      await syncNonprofitOrgType({
        ein: normalizedEin,
        org_type: nextOrgType,
        scopeLabel: data.label ?? null,
        scopeEntityId: data.entity_id ?? null,
      });
    }
  }

  return {
    id: String(data.id),
    district_entity_id: data.district_entity_id ?? null,
    entity_id: data.entity_id ?? null,
    ein: data.ein,
    label: data.label ?? null,
    org_type: data.org_type ?? null,
    tier: data.tier as ScopeTier,
    status: data.status as ScopeStatus,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

export async function createEntityFromEin(
  ein: string,
  opts?: { scope_id?: string | null },
): Promise<AdminCreateEntityResponse> {
  const normalizedEin = normalizeEinInput(ein);
  if (!normalizedEin) {
    throw new Error("EIN is required");
  }

  const scopedOrgType = await fetchScopeOrgType(
    normalizedEin,
    opts?.scope_id ?? null,
  );

  const irs: IrsPostgrestClient = getIrsClient();

  // Helper to ensure nonprofit shell and onboarding progress are up to date
  async function hydrateNonprofitShell(params: {
    entityId: string;
    ein: string;
    name?: string | null;
    scopeId?: string | null;
    orgType?: OrgType | null;
  }): Promise<void> {
    const { entityId, ein, name, scopeId, orgType } = params;

    // 1) Ensure a canonical nonprofit shell exists (public.nonprofits)
    const { error: nonprofitUpsertError } = await supabaseAdmin
      .from("nonprofits")
      .upsert(
        {
          entity_id: entityId,
          name: (name && name.trim()) ? name.trim() : `Nonprofit ${ein}`,
          ein,
          // REQUIRED (no DB default)
          org_type: orgType ?? "external_charity",
        },
        { onConflict: "entity_id" },
      );

    if (nonprofitUpsertError) {
      throw new Error(nonprofitUpsertError.message);
    }

    // 2) Mark identity as complete (identity is satisfied once shell exists)
    const { error: progressUpsertError } = await supabaseAdmin
      .from("entity_onboarding_progress")
      .upsert(
        {
          entity_id: entityId,
          section: "identity",
          status: "complete",
          last_updated: new Date().toISOString(),
        },
        { onConflict: "entity_id,section" },
      );

    if (progressUpsertError) {
      throw new Error(progressUpsertError.message);
    }

    // 3) Backfill scope row(s) so the onboarding queue can resolve entity_id
    // Prefer a specific scope_id when provided (precise). Fallback to updating all matching EIN rows.
    if (scopeId) {
      await backfillScopeNonprofitEntity({
        scope_id: scopeId,
        entity_id: entityId,
      });
    } else {
      const { error: scopeUpdateError } = await supabaseAdmin
        .from("superintendent_scope_nonprofits")
        .update({ entity_id: entityId })
        .eq("ein", ein);

      if (scopeUpdateError) {
        throw new Error(scopeUpdateError.message);
      }
    }
  }

  const { data: existingLink, error: linkError } = await irs
    .from("entity_links")
    .select("ein, entity_id")
    .eq("ein", normalizedEin)
    .maybeSingle();

  if (linkError) {
    throw new Error(linkError.message);
  }

  if (existingLink?.entity_id) {
    const { data: entityRow, error: entityError } = await supabaseAdmin
      .from("entities")
      .select("id, name, slug")
      .eq("id", existingLink.entity_id)
      .maybeSingle();

    if (entityError) {
      throw new Error(entityError.message);
    }

    if (entityRow?.id) {
      await hydrateNonprofitShell({
        entityId: String(entityRow.id),
        ein: normalizedEin,
        name: entityRow.name ?? null,
        scopeId: opts?.scope_id ?? null,
        orgType: scopedOrgType,
      });
    }

    return {
      entity: entityRow
        ? {
          id: String(entityRow.id),
          name: String(entityRow.name),
          slug: String(entityRow.slug),
        }
        : null,
      created: false,
      linked: true,
    };
  }

  const { data: existingEntity, error: existingEntityError } =
    await supabaseAdmin
      .from("entities")
      .select("id, name, slug")
      .contains("external_ids", { ein: normalizedEin })
      .maybeSingle();

  if (existingEntityError) {
    throw new Error(existingEntityError.message);
  }

  if (existingEntity?.id) {
    const { error: linkInsertError } = await irs
      .from("entity_links")
      .upsert(
        { ein: normalizedEin, entity_id: existingEntity.id },
        { onConflict: "ein" },
      );

    if (linkInsertError) {
      throw new Error(linkInsertError.message);
    }

    await hydrateNonprofitShell({
      entityId: String(existingEntity.id),
      ein: normalizedEin,
      name: existingEntity.name ?? null,
      scopeId: opts?.scope_id ?? null,
      orgType: scopedOrgType,
    });

    return {
      entity: {
        id: String(existingEntity.id),
        name: String(existingEntity.name),
        slug: String(existingEntity.slug),
      },
      created: false,
      linked: true,
    };
  }

  const { data: organization, error: orgError } = await irs
    .from("organizations")
    .select("ein, legal_name")
    .eq("ein", normalizedEin)
    .maybeSingle();

  if (orgError) {
    throw new Error(orgError.message);
  }

  if (!organization?.legal_name) {
    throw new Error("Organization not found for EIN");
  }

  const name = organization.legal_name;
  const slug = slugify(`${name}-${normalizedEin}`);

  const { data: entityRow, error: entityError } = await supabaseAdmin
    .from("entities")
    .insert({
      entity_type: "nonprofit",
      name,
      slug,
      external_ids: { ein: normalizedEin },
    })
    .select("id, name, slug")
    .single();

  if (entityError) {
    throw new Error(entityError.message);
  }

  const { error: linkInsertError } = await irs
    .from("entity_links")
    .insert({ ein: normalizedEin, entity_id: entityRow.id });

  if (linkInsertError) {
    throw new Error(linkInsertError.message);
  }

  await hydrateNonprofitShell({
    entityId: String(entityRow.id),
    ein: normalizedEin,
    name: entityRow.name ?? null,
    scopeId: opts?.scope_id ?? null,
    orgType: scopedOrgType,
  });

  return {
    entity: {
      id: String(entityRow.id),
      name: String(entityRow.name),
      slug: String(entityRow.slug),
    },
    created: true,
    linked: true,
  };
}
