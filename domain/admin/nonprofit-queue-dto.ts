import "server-only";

import type { Database } from "@/database.types";
import { supabaseAdmin } from "@/utils/supabase/service-worker";
import type { OnboardingQueueRow } from "@/app/admin/nonprofits/types";

type ScopeReadyRow =
  Database["public"]["Views"]["superintendent_scope_nonprofits_ready"]["Row"];

type ScopeStatus = "candidate" | "active" | "archived" | string;

type NextStep = OnboardingQueueRow["next_step"];

function resolveNextStep(params: {
  hasEntity: boolean;
  needsIdentity: boolean;
  hasIrsLink: boolean;
  status: ScopeStatus;
}): NextStep {
  const { hasEntity, needsIdentity, hasIrsLink, status } = params;

  if (!hasEntity) return "create_entity";
  if (needsIdentity) return "identity";
  if (!hasIrsLink) return "link_irs";
  if (status !== "active") return "verify";
  return "unknown";
}

function buildActionUrl(
  row: ScopeReadyRow,
  nextStep: NextStep,
  params?: { ein?: string | null },
): string {
  const searchParams = new URLSearchParams();
  searchParams.set("scope_id", String(row.id));
  if (params?.ein) {
    searchParams.set("ein", params.ein);
  }

  if (nextStep === "create_entity" || !row.entity_id) {
    return `/admin/nonprofits/new?${searchParams.toString()}`;
  }
  return `/admin/nonprofits/${row.entity_id}/onboarding?${searchParams.toString()}`;
}

function normalizeEinDigits(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function normalizeEinCanonical(value: string): string {
  const digits = normalizeEinDigits(value);
  if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return value;
}

export async function getOnboardingQueue(): Promise<OnboardingQueueRow[]> {
  const { data, error } = await supabaseAdmin
    .from("superintendent_scope_nonprofits_ready")
    .select(
      "id, district_entity_id, entity_id, ein, label, status, tier, created_at, updated_at, has_entity, has_irs_link, has_returns, is_ready",
    )
    .neq("status", "archived")
    .eq("is_ready", false)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Resolve entity ids from the scope view, but also fall back to the canonical nonprofit shell
  // (public.nonprofits.ein) because some scope rows may not have entity_id populated yet.
  const scopeEntityIds = (data ?? [])
    .map((row) => row.entity_id)
    .filter((value): value is string => Boolean(value));

  const einValues = (data ?? [])
    .map((row) => row.ein)
    .filter((value): value is string => Boolean(value));

  const einLookupKeys = Array.from(
    new Set(
      einValues.flatMap((ein) => {
        const digits = normalizeEinDigits(ein);
        const canonical = normalizeEinCanonical(ein);

        const keys = [ein];
        if (canonical && canonical !== ein) keys.push(canonical);
        if (digits && digits !== ein) keys.push(digits);
        return keys;
      }),
    ),
  );

  type Empty<T> = { data: T[]; error: null };
  const empty = <T>(): Empty<T> => ({ data: [], error: null });

  // 1) Look up any existing nonprofit shells by EIN (handles scope rows with entity_id=null)
  const nonprofitByEinResult = einLookupKeys.length
    ? await supabaseAdmin
      .from("nonprofits")
      .select("entity_id, ein, created_at")
      .in("ein", einLookupKeys)
    : await Promise.resolve(
      empty<
        { entity_id: string; ein: string | null; created_at: string | null }
      >(),
    );

  if (nonprofitByEinResult.error) {
    throw new Error(nonprofitByEinResult.error.message);
  }

  // Map EIN(digits) -> best entity_id. If dupes, prefer most recently created.
  const entityIdByNormalizedEin = new Map<
    string,
    { entityId: string; createdAt: number }
  >();
  for (const row of nonprofitByEinResult.data ?? []) {
    const ein = row.ein ? normalizeEinDigits(String(row.ein)) : "";
    const entityId = row.entity_id ? String(row.entity_id) : "";
    if (!ein || !entityId) continue;

    const createdAt = row.created_at ? Date.parse(row.created_at) : 0;
    const existing = entityIdByNormalizedEin.get(ein);
    if (!existing || createdAt >= existing.createdAt) {
      entityIdByNormalizedEin.set(ein, { entityId, createdAt });
    }
  }

  const derivedEntityIds = Array.from(entityIdByNormalizedEin.values()).map((
    r,
  ) => r.entityId);
  const allEntityIds = Array.from(
    new Set([...scopeEntityIds, ...derivedEntityIds]),
  );

  // 2) Now query canonical tables using ALL ids (scope ids + derived ids)
  const [entitiesResult, nonprofitsResult, progressResult] = await Promise.all([
    allEntityIds.length
      ? supabaseAdmin
        .from("entities")
        .select("id")
        .in("id", allEntityIds)
        .eq("entity_type", "nonprofit")
      : Promise.resolve(empty<{ id: string }>()),

    allEntityIds.length
      ? supabaseAdmin
        .from("nonprofits")
        .select("entity_id")
        .in("entity_id", allEntityIds)
      : Promise.resolve(empty<{ entity_id: string }>()),

    allEntityIds.length
      ? supabaseAdmin
        .from("entity_onboarding_progress")
        .select("entity_id, status")
        .in("entity_id", allEntityIds)
        .eq("section", "identity")
      : Promise.resolve(empty<{ entity_id: string; status: string | null }>()),
  ]);

  if (entitiesResult.error) throw new Error(entitiesResult.error.message);
  if (nonprofitsResult.error) throw new Error(nonprofitsResult.error.message);
  if (progressResult.error) throw new Error(progressResult.error.message);

  const existingEntityIds = new Set(
    (entitiesResult.data ?? []).map((row) => String(row.id)),
  );
  const nonprofitEntityIds = new Set(
    (nonprofitsResult.data ?? []).map((row) => String(row.entity_id)),
  );
  const identityStatusByEntityId = new Map(
    (progressResult.data ?? []).map((row) => [
      String(row.entity_id),
      String(row.status ?? "pending"),
    ]),
  );

  return (data ?? []).map((row) => {
    const entityId = row.entity_id
      ? String(row.entity_id)
      : row.ein
      ? entityIdByNormalizedEin.get(normalizeEinDigits(String(row.ein)))
        ?.entityId ??
        null
      : null;
    const hasEntityRecord = entityId ? existingEntityIds.has(entityId) : false;
    const hasNonprofitRecord = entityId
      ? nonprofitEntityIds.has(entityId)
      : false;
    const identityStatus = entityId
      ? identityStatusByEntityId.get(entityId)
      : null;

    // If the nonprofit shell exists but there's no progress row yet, treat identity as satisfied.
    const identityComplete = identityStatus === "complete" ||
      (identityStatus === null && hasNonprofitRecord);

    const needsIdentity = hasEntityRecord && !identityComplete;
    const next_step = resolveNextStep({
      hasEntity: hasEntityRecord,
      needsIdentity,
      hasIrsLink: Boolean(row.has_irs_link),
      status: (row.status ?? "") as ScopeStatus,
    });
    return {
      scope_id: String(row.id),
      district_entity_id: row.district_entity_id ?? null,
      label: row.label ?? null,
      ein: row.ein ?? null,
      // `has_entity` should reflect whether the canonical `public.entities` row exists.
      // A nonprofit shell row in `public.nonprofits` may still be missing while the entity exists.
      has_entity: hasEntityRecord,
      entity_id: entityId,
      status: (row.status ?? "candidate") as OnboardingQueueRow["status"],
      has_irs_link: Boolean(row.has_irs_link),
      has_returns: Boolean(row.has_returns),
      is_ready: Boolean(row.is_ready),
      next_step,
      action_url: buildActionUrl(
        { ...row, entity_id: entityId } as ScopeReadyRow,
        next_step,
        { ein: row.ein ?? null },
      ),
    };
  });
}
