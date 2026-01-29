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

  const entityIds = (data ?? [])
    .map((row) => row.entity_id)
    .filter((value): value is string => Boolean(value));

  const [entitiesResult, nonprofitsResult, progressResult] = await Promise.all([
    entityIds.length
      ? supabaseAdmin
          .from("entities")
          .select("id")
          .in("id", entityIds)
          .eq("entity_type", "nonprofit")
      : Promise.resolve({ data: [] }),
    entityIds.length
      ? supabaseAdmin.from("nonprofits").select("entity_id").in(
          "entity_id",
          entityIds,
        )
      : Promise.resolve({ data: [] }),
    entityIds.length
      ? supabaseAdmin
          .from("entity_onboarding_progress")
          .select("entity_id, status")
          .in("entity_id", entityIds)
          .eq("section", "identity")
      : Promise.resolve({ data: [] }),
  ]);

  if (entitiesResult.error) {
    throw new Error(entitiesResult.error.message);
  }
  if (nonprofitsResult.error) {
    throw new Error(nonprofitsResult.error.message);
  }
  if (progressResult.error) {
    throw new Error(progressResult.error.message);
  }

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
    const entityId = row.entity_id ? String(row.entity_id) : null;
    const hasEntityRecord = entityId ? existingEntityIds.has(entityId) : false;
    const hasNonprofitRecord = entityId
      ? nonprofitEntityIds.has(entityId)
      : false;
    const identityStatus = entityId
      ? identityStatusByEntityId.get(entityId)
      : null;
    const needsIdentity = hasEntityRecord &&
      (!hasNonprofitRecord || identityStatus !== "complete");
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
      entity_id: row.entity_id ?? null,
      status: (row.status ?? "candidate") as OnboardingQueueRow["status"],
      has_entity: hasNonprofitRecord,
      has_irs_link: Boolean(row.has_irs_link),
      has_returns: Boolean(row.has_returns),
      is_ready: Boolean(row.is_ready),
      next_step,
      action_url: buildActionUrl(row, next_step, { ein: row.ein ?? null }),
    };
  });
}
