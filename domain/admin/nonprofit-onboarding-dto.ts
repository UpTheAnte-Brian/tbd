import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createApiClient } from "@/utils/supabase/route";
import {
  createIrsAdminClient,
  supabaseAdmin,
} from "@/utils/supabase/service-worker";
import {
  ONBOARDING_SECTIONS,
  type OnboardingSection,
  type OnboardingSectionStatus,
} from "@/app/lib/nonprofit-onboarding";
import type {
  CreateNonprofitRequest,
  CreateNonprofitResponse,
  NonprofitOnboardingData,
  UpdateOnboardingIdentityRequest,
  UpsertOverrideRequest,
} from "@/app/lib/types/nonprofit-onboarding";
import type { Database, Json } from "@/database.types";
import { materializeEntityPeople } from "@/domain/entities/entity-people-dto";

type PostgrestMaybeSingleError = {
  code?: string;
  status?: number;
  message?: string;
} | null;

const RELATIONSHIP_TYPE = "affiliated_with";

const isNotFoundError = (error: PostgrestMaybeSingleError) =>
  error?.code === "PGRST116" || error?.status === 406;

function slugify(value: string): string {
  const cleaned = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{ASCII}]/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return cleaned || "nonprofit";
}

function normalizeEinInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length === 9 ? digits : null;
}

async function updateScopeById(
  supabase: SupabaseClient<Database>,
  scopeId: string,
  updates:
    Database["public"]["Tables"]["superintendent_scope_nonprofits"]["Update"],
) {
  const { error } = await supabase
    .from("superintendent_scope_nonprofits")
    .update(updates)
    .eq("id", scopeId);

  if (error) {
    throw new Error(error.message);
  }
}

async function updateScopeByEntity(
  supabase: SupabaseClient<Database>,
  entityId: string,
  updates:
    Database["public"]["Tables"]["superintendent_scope_nonprofits"]["Update"],
) {
  const { error } = await supabase
    .from("superintendent_scope_nonprofits")
    .update(updates)
    .eq("entity_id", entityId);

  if (error) {
    throw new Error(error.message);
  }
}

async function fetchScopeReadyRow(
  supabase: SupabaseClient<Database>,
  params: { scopeId?: string | null; entityId?: string | null },
) {
  const { scopeId, entityId } = params;

  // We intentionally do a two-query merge here:
  // 1) Base scope row from `superintendent_scope_nonprofits` (authoritative identity fields)
  // 2) Readiness/rollups from `superintendent_scope_nonprofits_ready` (derived signals)
  // This avoids coupling TypeScript to view column drift and keeps the UI stable.

  type BaseScopeRow = Pick<
    Database["public"]["Tables"]["superintendent_scope_nonprofits"]["Row"],
    | "id"
    | "district_entity_id"
    | "entity_id"
    | "ein"
    | "label"
    | "org_type"
    | "status"
    | "tier"
    | "created_at"
    | "updated_at"
  >;

  type ReadyScopeRow = Pick<
    Database["public"]["Views"]["superintendent_scope_nonprofits_ready"]["Row"],
    | "scope_id"
    | "has_irs_org"
    | "has_returns"
    | "latest_tax_year"
    | "total_revenue"
    | "total_net_assets"
    | "tax_period_end"
    | "filed_on"
  >;

  let baseQuery = supabase
    .from("superintendent_scope_nonprofits")
    .select(
      "id, district_entity_id, entity_id, ein, label, org_type, status, tier, created_at, updated_at",
    )
    .limit(1);

  if (scopeId) {
    baseQuery = baseQuery.eq("id", scopeId);
  } else if (entityId) {
    baseQuery = baseQuery.eq("entity_id", entityId);
  } else {
    return null;
  }

  const { data: baseRaw, error: baseError } = await baseQuery.maybeSingle();
  const base = (baseRaw as BaseScopeRow | null) ?? null;
  if (baseError && !isNotFoundError(baseError as PostgrestMaybeSingleError)) {
    throw new Error(baseError.message);
  }
  if (!base?.id) return null;

  const baseScopeId = String(base.id);

  // Derived view: by convention this view exposes `scope_id` as the PK from
  // `superintendent_scope_nonprofits.id`.
  const { data: readyRaw, error: readyError } = await supabase
    .from("superintendent_scope_nonprofits_ready")
    .select(
      "scope_id, has_irs_org, has_returns, latest_tax_year, total_revenue, total_net_assets, tax_period_end, filed_on",
    )
    .eq("scope_id", baseScopeId)
    .maybeSingle();
  const ready = (readyRaw as ReadyScopeRow | null) ?? null;

  if (readyError && !isNotFoundError(readyError as PostgrestMaybeSingleError)) {
    throw new Error(readyError.message);
  }

  return {
    scope_id: baseScopeId,
    district_entity_id: base.district_entity_id ?? null,
    entity_id: base.entity_id ?? null,
    ein: base.ein ?? null,
    label: base.label ?? null,
    org_type: base.org_type ?? null,
    status: base.status ?? null,
    tier: base.tier ?? null,
    created_at: base.created_at ?? null,
    updated_at: base.updated_at ?? null,

    // Readiness/rollups (nullable if the view row isn't present yet)
    has_irs_org: ready?.has_irs_org ?? null,
    has_returns: ready?.has_returns ?? null,
    latest_tax_year: ready?.latest_tax_year ?? null,
    total_revenue: ready?.total_revenue ?? null,
    total_net_assets: ready?.total_net_assets ?? null,
    tax_period_end: ready?.tax_period_end ?? null,
    filed_on: ready?.filed_on ?? null,
  };
}

async function ensureUniqueSlug(
  supabase: SupabaseClient<Database>,
  baseSlug: string,
  entityId?: string,
): Promise<string> {
  let candidate = baseSlug;
  let suffix = 1;

  while (suffix < 20) {
    let query = supabase
      .from("entities")
      .select("id")
      .eq("entity_type", "nonprofit")
      .eq("slug", candidate);

    if (entityId) {
      query = query.neq("id", entityId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.id) return candidate;

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return `${baseSlug}-${Date.now()}`;
}

async function bestEffortCleanup(
  supabase: SupabaseClient<Database>,
  entityId: string | null,
  nonprofitId: string | null,
) {
  try {
    if (nonprofitId) {
      await supabase.from("nonprofits").delete().eq("id", nonprofitId);
    }
  } catch (err) {
    console.error("Cleanup failed for nonprofit", err);
  }

  try {
    if (entityId) {
      await supabase.from("entities").delete().eq("id", entityId);
    }
  } catch (err) {
    console.error("Cleanup failed for entity", err);
  }
}

async function syncEntityEinExternalId(
  supabase: SupabaseClient<Database>,
  entityId: string,
  ein: string | null,
) {
  const { data: entity, error: entityError } = await supabase
    .from("entities")
    .select("external_ids")
    .eq("id", entityId)
    .maybeSingle();

  if (entityError) {
    throw new Error(entityError.message);
  }

  const currentExternalIds =
    (entity?.external_ids as Record<string, unknown> | null) ?? {};
  const nextExternalIds = { ...currentExternalIds };

  if (ein) {
    nextExternalIds.ein = ein;
  } else {
    delete nextExternalIds.ein;
  }

  const { error: updateError } = await supabase
    .from("entities")
    .update({ external_ids: nextExternalIds as Json })
    .eq("id", entityId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

async function seedOnboardingProgress(
  supabase: SupabaseClient<Database>,
  entityId: string,
) {
  const payload = ONBOARDING_SECTIONS.map((section) => ({
    entity_id: entityId,
    section,
    status: "pending",
  }));

  const { error } = await supabase
    .from("entity_onboarding_progress")
    .upsert(payload, { onConflict: "entity_id,section" });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createNonprofitShell(
  request: CreateNonprofitRequest,
): Promise<CreateNonprofitResponse> {
  const supabase = await createApiClient();
  const name = request.name?.trim();
  const orgType = request.org_type;
  const districtEntityId = request.district_entity_id?.trim();
  const scopeId = request.scope_id?.trim() || null;
  const websiteUrl = request.website_url?.trim() || null;
  const missionStatement = request.mission_statement?.trim() || null;
  let normalizedEin = normalizeEinInput(request.ein ?? null);

  // Idempotency / duplicate prevention
  // 1) If the scope row already has an entity_id, treat this as an existing shell and return it.
  if (scopeId) {
    const { data: existingScope, error: scopeLookupError } = await supabase
      .from("superintendent_scope_nonprofits")
      .select("entity_id, ein")
      .eq("id", scopeId)
      .maybeSingle();

    if (
      scopeLookupError &&
      !isNotFoundError(scopeLookupError as PostgrestMaybeSingleError)
    ) {
      throw new Error(scopeLookupError.message);
    }

    const existingEntityId = existingScope?.entity_id
      ? String(existingScope.entity_id)
      : null;

    // If the client didn't send an EIN but the scope row has one, use it for idempotency.
    if (!normalizedEin && existingScope?.ein) {
      normalizedEin = normalizeEinInput(String(existingScope.ein));
    }

    if (existingEntityId) {
      const { data: existingEntity, error: existingEntityError } =
        await supabase
          .from("entities")
          .select("id, slug")
          .eq("id", existingEntityId)
          .maybeSingle();

      if (
        existingEntityError &&
        !isNotFoundError(existingEntityError as PostgrestMaybeSingleError)
      ) {
        throw new Error(existingEntityError.message);
      }

      if (scopeId && orgType) {
        await updateScopeById(supabase, scopeId, {
          org_type: orgType,
        });
      }
      if (normalizedEin) {
        await syncEntityEinExternalId(supabase, existingEntityId, normalizedEin);
      }

      return {
        entity_id: existingEntityId,
        nonprofit_id: existingEntityId,
        slug: String(existingEntity?.slug ?? ""),
        scope_id: scopeId,
      };
    }
  }

  // 2) If an EIN is provided and we already have a nonprofit shell for it, return the existing one.
  if (normalizedEin) {
    const { data: existingNonprofit, error: existingNonprofitError } =
      await supabase
        .from("nonprofits")
        .select("entity_id")
        .eq("ein", normalizedEin)
        .maybeSingle();

    if (
      existingNonprofitError &&
      !isNotFoundError(existingNonprofitError as PostgrestMaybeSingleError)
    ) {
      throw new Error(existingNonprofitError.message);
    }

    const existingEntityId = existingNonprofit?.entity_id
      ? String(existingNonprofit.entity_id)
      : null;

    if (existingEntityId) {
      const { data: existingEntity, error: existingEntityError } =
        await supabase
          .from("entities")
          .select("id, slug")
          .eq("id", existingEntityId)
          .maybeSingle();

      if (
        existingEntityError &&
        !isNotFoundError(existingEntityError as PostgrestMaybeSingleError)
      ) {
        throw new Error(existingEntityError.message);
      }

      // If the scope is present but not yet linked, link it now for consistency.
      if (scopeId) {
        await updateScopeById(supabase, scopeId, {
          entity_id: existingEntityId,
          ein: normalizedEin ?? undefined,
          org_type: orgType ?? undefined,
        });
      }
      await syncEntityEinExternalId(supabase, existingEntityId, normalizedEin);

      return {
        entity_id: existingEntityId,
        nonprofit_id: existingEntityId,
        slug: String(existingEntity?.slug ?? ""),
      };
    }
  }
  if (!name || !orgType || !districtEntityId) {
    throw new Error("name, org_type, and district_entity_id are required");
  }

  const slugBase = slugify(name);
  const slug = await ensureUniqueSlug(supabase, slugBase);

  let entityId: string | null = null;
  let nonprofitId: string | null = null;

  try {
    const { data: entity, error: entityError } = await supabase
      .from("entities")
      .insert({
        entity_type: "nonprofit",
        name,
        slug,
        active: false,
        external_ids: normalizedEin ? { ein: normalizedEin } : {},
      })
      .select("id, slug")
      .single();

    if (entityError || !entity) {
      throw new Error(entityError?.message ?? "Failed to create entity");
    }

    entityId = String(entity.id);

    const insertPayload: Database["public"]["Tables"]["nonprofits"]["Insert"] =
      {
        id: entityId,
        entity_id: entityId,
        name,
        org_type: orgType,
        ein: normalizedEin,
        website_url: websiteUrl,
        mission_statement: missionStatement,
        active: false,
      };

    const { data: nonprofit, error: nonprofitError } = await supabase
      .from("nonprofits")
      .insert(insertPayload)
      .select("id")
      .single();

    if (nonprofitError || !nonprofit) {
      throw new Error(nonprofitError?.message ?? "Failed to create nonprofit");
    }

    nonprofitId = String(nonprofit.id);

    if (scopeId) {
      await updateScopeById(supabase, scopeId, {
        entity_id: entityId,
        ein: normalizedEin ?? undefined,
        org_type: orgType,
      });
    }

    const { error: relationshipError } = await supabase
      .from("entity_relationships")
      .upsert(
        {
          parent_entity_id: districtEntityId,
          child_entity_id: entityId,
          relationship_type: RELATIONSHIP_TYPE,
          is_primary: true,
        },
        { onConflict: "parent_entity_id,child_entity_id,relationship_type" },
      );

    if (relationshipError) {
      throw new Error(relationshipError.message);
    }

    if (scopeId) {
      await updateScopeById(supabase, scopeId, {
        entity_id: entityId,
        ein: insertPayload.ein ?? undefined,
        org_type: orgType,
      });
    }

    await seedOnboardingProgress(supabase, entityId);

    if (insertPayload.ein) {
      const irs = createIrsAdminClient();
      await irs.from("entity_links").upsert(
        {
          ein: insertPayload.ein,
          entity_id: entityId,
          match_type: "manual",
          confidence: 100,
        },
        { onConflict: "ein" },
      );
    }

    return {
      entity_id: entityId,
      nonprofit_id: nonprofitId,
      slug: String(entity.slug ?? slug),
      scope_id: scopeId,
    };
  } catch (err) {
    await bestEffortCleanup(supabase, entityId, nonprofitId);
    throw err instanceof Error ? err : new Error("Failed to create nonprofit");
  }
}

export async function getNonprofitOnboardingData(
  entityId: string,
  scopeId?: string | null,
): Promise<NonprofitOnboardingData> {
  const supabase = await createApiClient();

  const { data: entity, error: entityError } = await supabase
    .from("entities")
    .select("id, name, slug, active, entity_type")
    .eq("id", entityId)
    .maybeSingle();

  if (entityError || !entity) {
    throw new Error(entityError?.message ?? "Entity not found");
  }

  const { data: nonprofit, error: nonprofitError } = await supabase
    .from("nonprofits")
    .select("*")
    .eq("entity_id", entityId)
    .maybeSingle();

  if (nonprofitError) {
    throw new Error(nonprofitError.message);
  }

  const { data: progress, error: progressError } = await supabase
    .from("entity_onboarding_progress")
    .select("*")
    .eq("entity_id", entityId)
    .order("section");

  if (progressError) {
    throw new Error(progressError.message);
  }

  const { data: overrides, error: overridesError } = await supabase
    .from("entity_field_overrides")
    .select("*")
    .eq("entity_id", entityId)
    .order("namespace");

  if (overridesError) {
    throw new Error(overridesError.message);
  }

  const { data: documents, error: documentsError } = await supabaseAdmin
    .from("documents")
    .select(
      "id, title, document_type, status, visibility, current_version_id, created_at, updated_at, tax_year",
    )
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (documentsError) {
    throw new Error(documentsError.message);
  }

  const { data: personClaims, error: personClaimsError } = await supabase
    .from("entity_person_claims")
    .select("*")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (personClaimsError) {
    throw new Error(personClaimsError.message);
  }

  let hasIrsLink = false;
  let linkedEin: string | null = null;
  let irsLink: NonprofitOnboardingData["irs_link"] = null;
  let irsOrganization: NonprofitOnboardingData["irs_organization"] = null;
  let irsLatestReturn: NonprofitOnboardingData["irs_latest_return"] = null;
  let irsFinancials: NonprofitOnboardingData["irs_financials"] = null;
  let irsPeople: NonprofitOnboardingData["irs_people"] = [];
  const scope = await fetchScopeReadyRow(supabase, {
    scopeId: scopeId ?? null,
    entityId,
  });

  try {
    const irs = createIrsAdminClient();
    const { data: link, error: linkError } = await irs
      .from("entity_links")
      .select("ein, match_type, confidence, created_at, notes")
      .eq("entity_id", entityId)
      .maybeSingle();
    if (linkError && !isNotFoundError(linkError)) {
      throw new Error(linkError.message);
    }
    if (link?.ein) {
      hasIrsLink = true;
      linkedEin = link.ein ?? null;
      irsLink = {
        ein: link.ein,
        match_type: link.match_type ?? "manual",
        confidence: link.confidence ?? null,
        created_at: link.created_at,
        notes: link.notes ?? null,
      };

      const { data: org, error: orgError } = await irs
        .from("organizations")
        .select("ein, legal_name, website, city, state")
        .eq("ein", link.ein)
        .maybeSingle();
      if (orgError && !isNotFoundError(orgError)) {
        throw new Error(orgError.message);
      }

      if (org?.ein) {
        irsOrganization = {
          ein: org.ein,
          legal_name: org.legal_name ?? null,
          website: org.website ?? null,
          city: org.city ?? null,
          state: org.state ?? null,
        };
      }

      const { data: latestReturn, error: latestReturnError } = await irs
        .from("latest_returns")
        .select("id, ein, tax_year, return_type, filed_on, updated_at")
        .eq("ein", link.ein)
        .maybeSingle();

      if (latestReturnError && !isNotFoundError(latestReturnError)) {
        throw new Error(latestReturnError.message);
      }

      if (latestReturn?.id) {
        irsLatestReturn = {
          id: latestReturn.id,
          ein: latestReturn.ein ?? null,
          tax_year: latestReturn.tax_year ?? null,
          return_type: latestReturn.return_type ?? null,
          filed_on: latestReturn.filed_on ?? null,
          updated_at: latestReturn.updated_at ?? null,
        };

        const { data: people, error: peopleError } = await irs
          .from("return_people")
          .select("id, name, title, role, is_current")
          .eq("return_id", latestReturn.id)
          .order("name");

        if (peopleError) {
          throw new Error(peopleError.message);
        }

        irsPeople = (people ?? []).map((person) => ({
          id: person.id,
          name: person.name,
          title: person.title ?? null,
          role: person.role,
          is_current: person.is_current ?? null,
        }));
      }

      const { data: financials, error: financialsError } = await irs
        .from("latest_financials")
        .select(
          "ein, return_id, tax_year, return_type, total_revenue, total_expenses, total_assets_begin, total_assets_end, net_assets_begin, net_assets_end, excess_or_deficit, updated_at",
        )
        .eq("ein", link.ein)
        .maybeSingle();

      if (financialsError) {
        throw new Error(financialsError.message);
      }

      if (financials) {
        irsFinancials = {
          ein: financials.ein ?? null,
          return_id: financials.return_id ?? null,
          tax_year: financials.tax_year ?? null,
          return_type: financials.return_type ?? null,
          total_revenue: financials.total_revenue ?? null,
          total_expenses: financials.total_expenses ?? null,
          total_assets_begin: financials.total_assets_begin ?? null,
          total_assets_end: financials.total_assets_end ?? null,
          net_assets_begin: financials.net_assets_begin ?? null,
          net_assets_end: financials.net_assets_end ?? null,
          excess_or_deficit: financials.excess_or_deficit ?? null,
          updated_at: financials.updated_at ?? null,
        };
      }
    }
  } catch (err) {
    console.warn("IRS link lookup failed", err);
  }

  return {
    entity: {
      id: String(entity.id),
      name: String(entity.name),
      slug: String(entity.slug),
      active: Boolean(entity.active),
      entity_type: String(entity.entity_type),
    },
    nonprofit: nonprofit ? { ...nonprofit, id: String(nonprofit.id) } : null,
    onboarding_progress: (progress ?? []).map((row) => ({
      ...row,
      entity_id: String(row.entity_id),
      section: String(row.section),
      status: String(row.status),
      last_updated: String(row.last_updated),
    })),
    hasIrsLink,
    linkedEin,
    irs_link: irsLink,
    irs_organization: irsOrganization,
    irs_latest_return: irsLatestReturn,
    irs_financials: irsFinancials,
    irs_people: irsPeople,
    overrides: (overrides ?? []).map((row) => ({
      ...row,
      entity_id: String(row.entity_id),
      namespace: String(row.namespace),
      field_key: String(row.field_key),
      source: String(row.source),
      updated_at: String(row.updated_at),
      confidence: Number(row.confidence),
      value: row.value,
      updated_by: row.updated_by ?? null,
    })),
    person_claims: (personClaims ?? []).map((row) => ({
      ...row,
      id: String(row.id),
      entity_id: String(row.entity_id),
      email: String(row.email),
      source: String(row.source),
      source_person_id: String(row.source_person_id),
      created_at: String(row.created_at),
      created_by: row.created_by ?? null,
    })),
    documents: (documents ?? []).map((row) => ({
      ...row,
      id: String(row.id),
      current_version_id: row.current_version_id ?? null,
      tax_year: row.tax_year ?? null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    })),
    scope,
    scope_id: scope?.scope_id ? String(scope.scope_id) : null,
  };
}

export async function updateNonprofitIdentity(
  entityId: string,
  payload: UpdateOnboardingIdentityRequest,
) {
  const supabase = await createApiClient();
  console.log("[updateNonprofitIdentity] start", {
    entityId,
    payloadKeys: Object.keys(payload ?? {}),
    einProvided: payload?.ein !== undefined,
    einValue: payload?.ein ?? null,
  });
  const updates: Database["public"]["Tables"]["nonprofits"]["Update"] = {};
  const normalizeOptional = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };
  let normalizedEin: string | null | undefined = undefined;

  let allowEinUpdate = true;
  if (payload.ein !== undefined) {
    console.log("[updateNonprofitIdentity] ein check", {
      entityId,
      ein: payload.ein,
    });
    try {
      const irs = createIrsAdminClient();
      const { data: link, error: linkError } = await irs
        .from("entity_links")
        .select("ein")
        .eq("entity_id", entityId)
        .maybeSingle();
      console.log("[updateNonprofitIdentity] existing irs link lookup", {
        entityId,
        linkEin: link?.ein ?? null,
        linkError: linkError
          ? {
            code: linkError?.code,
            message: linkError?.message,
          }
          : null,
      });
      if (linkError && !isNotFoundError(linkError)) {
        throw new Error(linkError.message);
      }

      if (link?.ein) {
        allowEinUpdate = false;
      }
    } catch (err) {
      console.warn("IRS link check failed; skipping EIN update", err);
      allowEinUpdate = false;
    }
  }

  console.log("[updateNonprofitIdentity] ein update decision", {
    entityId,
    allowEinUpdate,
    einProvided: payload.ein !== undefined,
  });

  if (payload.ein !== undefined && allowEinUpdate) {
    const normalizedInput = normalizeOptional(payload.ein);
    normalizedEin = normalizeEinInput(normalizedInput);

    if (normalizedInput && !normalizedEin) {
      throw new Error("EIN must be 9 digits or left blank.");
    }

    updates.ein = normalizedEin;
  }
  if (payload.website_url !== undefined) {
    updates.website_url = normalizeOptional(payload.website_url);
  }
  if (payload.mission_statement !== undefined) {
    updates.mission_statement = normalizeOptional(payload.mission_statement);
  }

  if (payload.name !== undefined) {
    const trimmed = payload.name?.trim() ?? "";
    if (!trimmed) {
      throw new Error("name cannot be empty");
    }
    const slugBase = slugify(trimmed);
    const slug = await ensureUniqueSlug(supabase, slugBase, entityId);

    const { error: entityError } = await supabase
      .from("entities")
      .update({ name: trimmed, slug })
      .eq("id", entityId);

    if (entityError) {
      throw new Error(entityError.message);
    }

    updates.name = trimmed;
  }

  console.log("[updateNonprofitIdentity] updates payload", {
    entityId,
    updates,
  });

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("nonprofits")
      .update(updates)
      .eq("entity_id", entityId);

    if (error) {
      throw new Error(error.message);
    }
    console.log("[updateNonprofitIdentity] nonprofits updated", { entityId });
  }

  if (normalizedEin !== undefined) {
    await syncEntityEinExternalId(supabase, entityId, normalizedEin);
  }

  if (normalizedEin) {
    await updateScopeByEntity(supabase, entityId, {
      ein: normalizedEin,
    });
  }

  console.log("[updateNonprofitIdentity] scope update", {
    entityId,
    normalizedEin,
  });

  await upsertOnboardingProgress(entityId, "identity", "complete");
}

export async function upsertOnboardingProgress(
  entityId: string,
  section: OnboardingSection,
  status: OnboardingSectionStatus,
) {
  const supabase = await createApiClient();
  const { error } = await supabase
    .from("entity_onboarding_progress")
    .upsert(
      {
        entity_id: entityId,
        section,
        status,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "entity_id,section" },
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertEntityFieldOverride(
  entityId: string,
  request: UpsertOverrideRequest,
) {
  if (request.value === undefined) {
    throw new Error("override value is required");
  }
  const supabase = await createApiClient();
  const payload:
    Database["public"]["Tables"]["entity_field_overrides"]["Insert"] = {
      entity_id: entityId,
      namespace: request.namespace,
      field_key: request.field_key,
      value: request
        .value as Database["public"]["Tables"]["entity_field_overrides"][
          "Insert"
        ]["value"],
      source: request.source ?? "manual",
      confidence: request.confidence ?? 100,
      updated_at: new Date().toISOString(),
      updated_by: null,
    };

  const { error } = await supabase
    .from("entity_field_overrides")
    .upsert(payload, { onConflict: "entity_id,namespace,field_key" });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteEntityFieldOverride(
  entityId: string,
  namespace: string,
  fieldKey: string,
) {
  const supabase = await createApiClient();
  const { error } = await supabase
    .from("entity_field_overrides")
    .delete()
    .eq("entity_id", entityId)
    .eq("namespace", namespace)
    .eq("field_key", fieldKey);

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertEntityPersonClaim(params: {
  entityId: string;
  sourcePersonId: string;
  email: string;
  source?: string;
}) {
  const supabase = await createApiClient();
  const email = params.email.trim().toLowerCase();
  if (!email) {
    throw new Error("email is required");
  }
  const payload:
    Database["public"]["Tables"]["entity_person_claims"]["Insert"] = {
      entity_id: params.entityId,
      source: params.source ?? "irs",
      source_person_id: params.sourcePersonId,
      email,
      created_by: null,
    };

  const { error } = await supabase
    .from("entity_person_claims")
    .upsert(payload, { onConflict: "entity_id,source,source_person_id" });

  if (error) {
    throw new Error(error.message);
  }
}

export async function linkEntityToIrsEin(entityId: string, ein: string) {
  const normalizedEin = normalizeEinInput(ein);
  if (!normalizedEin) {
    throw new Error("EIN is required to link IRS organization");
  }

  const supabase = await createApiClient();
  const irs = createIrsAdminClient();

  const { data: org, error: orgError } = await irs
    .from("organizations")
    .select("ein")
    .eq("ein", normalizedEin)
    .maybeSingle();

  if (orgError) {
    throw new Error(orgError.message);
  }

  if (!org?.ein) {
    throw new Error("IRS organization not found for EIN");
  }

  const { error: linkError } = await irs.from("entity_links").upsert(
    {
      ein: normalizedEin,
      entity_id: entityId,
      match_type: "manual",
      confidence: 100,
    },
    { onConflict: "ein" },
  );

  if (linkError) {
    throw new Error(linkError.message);
  }

  await updateScopeByEntity(supabase, entityId, { status: "active" });

  await upsertOnboardingProgress(entityId, "irs_link", "complete");
}

export async function activateEntity(entityId: string) {
  const supabase = await createApiClient();

  const { error: entityError } = await supabase
    .from("entities")
    .update({ active: true })
    .eq("id", entityId);

  if (entityError) {
    throw new Error(entityError.message);
  }

  const { error: statusError } = await supabase
    .from("entity_status")
    .upsert({ entity_id: entityId, status: "active" }, {
      onConflict: "entity_id",
    });

  if (statusError) {
    throw new Error(statusError.message);
  }

  const irs = createIrsAdminClient();
  const { data: link, error: linkError } = await irs
    .from("entity_links")
    .select("ein")
    .eq("entity_id", entityId)
    .maybeSingle();

  if (linkError && !isNotFoundError(linkError as PostgrestMaybeSingleError)) {
    throw new Error(linkError.message);
  }

  if (link?.ein) {
    await materializeEntityPeople({ entityId, ein: link.ein });
  }

  await upsertOnboardingProgress(entityId, "activation", "complete");
}
