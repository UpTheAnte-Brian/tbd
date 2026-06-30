import "server-only";

import type { Database } from "@/database.types";
import { supabaseAdmin } from "@/utils/supabase/service-worker";
import type { OnboardingQueueRow } from "@/app/admin/nonprofits/types";
import { stripPublicSchoolDistrictSuffix } from "@/app/lib/utils/districts";

type ScopeQueueRow =
  Database["public"]["Views"]["v_district_scope_nonprofits"]["Row"];
type EntityRow = Database["public"]["Tables"]["entities"]["Row"];
type NonprofitRow = Database["public"]["Tables"]["nonprofits"]["Row"];
type OnboardingProgressRow =
  Database["public"]["Tables"]["entity_onboarding_progress"]["Row"];
type EntityRelationshipRow =
  Database["public"]["Tables"]["entity_relationships"]["Row"];

const DISTRICT_RELATIONSHIP_TYPE = "affiliated_with";

function isIncompleteStatus(
  status: OnboardingProgressRow["status"] | null | undefined,
) {
  return status !== "complete" && status !== "skipped";
}

function sortQueueRows(a: OnboardingQueueRow, b: OnboardingQueueRow) {
  const districtA = a.district_name ?? "";
  const districtB = b.district_name ?? "";
  if (districtA && districtB) {
    const districtCompare = districtA.localeCompare(districtB);
    if (districtCompare !== 0) return districtCompare;
  } else if (districtA || districtB) {
    return districtA ? -1 : 1;
  }
  const labelA = a.label ?? "";
  const labelB = b.label ?? "";
  if (labelA && labelB) return labelA.localeCompare(labelB);
  if (labelA || labelB) return labelA ? -1 : 1;
  return (a.ein ?? "").localeCompare(b.ein ?? "");
}

export async function getOnboardingQueue(
  opts?: { includeArchived?: boolean },
): Promise<OnboardingQueueRow[]> {
  let query = supabaseAdmin
    .from("v_district_scope_nonprofits")
    .select(
      "district_entity_id, ein, scope_label, tier, status, org_type, has_entity, entity_id, irs_legal_name, has_irs_org, has_returns, latest_return_type",
    );

  if (!opts?.includeArchived) {
    query = query.neq("status", "archived");
  }

  const { data, error } = await query
    .order("scope_label", { ascending: true, nullsFirst: false })
    .order("irs_legal_name", { ascending: true, nullsFirst: false })
    .returns<ScopeQueueRow[]>();
  if (error) {
    throw new Error(error.message);
  }

  const scopeRows = (data ?? []).map((row) => ({
    queue_source: "scope" as const,
    has_scope_row: true,
    district_entity_id: row.district_entity_id ?? null,
    district_name: null,
    label: row.scope_label ?? row.irs_legal_name ?? null,
    ein: row.ein ?? null,
    entity_id: row.entity_id ?? null,
    status: (row.status ?? null) as OnboardingQueueRow["status"],
    tier: (row.tier ?? null) as OnboardingQueueRow["tier"],
    org_type: (row.org_type ?? null) as OnboardingQueueRow["org_type"],
    has_entity: Boolean(row.has_entity),
    has_irs_org: Boolean(row.has_irs_org),
    has_returns: Boolean(row.has_returns),
    latest_return_type: row.latest_return_type ?? null,
  }));

  const scopeEntityIds = new Set(
    scopeRows
      .map((row) => row.entity_id)
      .filter((value): value is string => Boolean(value)),
  );

  const { data: nonprofitShells, error: shellError } = await supabaseAdmin
    .from("nonprofits")
    .select("entity_id, name, ein, org_type, active")
    .returns<
      Pick<NonprofitRow, "entity_id" | "name" | "ein" | "org_type" | "active">[]
    >();

  if (shellError) {
    throw new Error(shellError.message);
  }

  const candidateShells = (nonprofitShells ?? []).filter(
    (row) => !scopeEntityIds.has(String(row.entity_id)),
  );

  const candidateEntityIds = candidateShells.map((row) => String(row.entity_id));

  const progressByEntityId = new Map<string, OnboardingProgressRow[]>();

  if (candidateEntityIds.length > 0) {
    const { data: progressRows, error: progressError } = await supabaseAdmin
      .from("entity_onboarding_progress")
      .select("entity_id, section, status, last_updated")
      .in("entity_id", candidateEntityIds)
      .returns<OnboardingProgressRow[]>();

    if (progressError) {
      throw new Error(progressError.message);
    }

    for (const row of progressRows ?? []) {
      const entityId = String(row.entity_id);
      const existing = progressByEntityId.get(entityId) ?? [];
      existing.push(row);
      progressByEntityId.set(entityId, existing);
    }
  }

  const manualShells = candidateShells.filter((row) => {
    const progressRows = progressByEntityId.get(String(row.entity_id)) ?? [];
    if (progressRows.length === 0) return false;
    return (
      !row.active || progressRows.some((entry) => isIncompleteStatus(entry.status))
    );
  });

  const manualEntityIds = manualShells.map((row) => String(row.entity_id));
  const districtRelationships = new Map<string, string>();

  if (manualEntityIds.length > 0) {
    const { data: relationships, error: relationshipError } =
      await supabaseAdmin
        .from("entity_relationships")
        .select(
          "child_entity_id, parent_entity_id, is_primary, relationship_type",
        )
        .in("child_entity_id", manualEntityIds)
        .eq("relationship_type", DISTRICT_RELATIONSHIP_TYPE)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true })
        .returns<EntityRelationshipRow[]>();

    if (relationshipError) {
      throw new Error(relationshipError.message);
    }

    for (const row of relationships ?? []) {
      const childEntityId = String(row.child_entity_id);
      if (!districtRelationships.has(childEntityId)) {
        districtRelationships.set(childEntityId, String(row.parent_entity_id));
      }
    }
  }

  const districtEntityIds = Array.from(
    new Set(
      [
        ...scopeRows.map((row) => row.district_entity_id),
        ...Array.from(districtRelationships.values()),
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  const districtNames = new Map<string, string>();

  if (districtEntityIds.length > 0) {
    const { data: districtEntities, error: districtError } = await supabaseAdmin
      .from("entities")
      .select("id, name")
      .in("id", districtEntityIds)
      .returns<EntityRow[]>();

    if (districtError) {
      throw new Error(districtError.message);
    }

    (districtEntities ?? []).forEach((entity) => {
      districtNames.set(entity.id, entity.name);
    });
  }

  const manualRows: OnboardingQueueRow[] = manualShells.map((row) => {
    const entityId = String(row.entity_id);
    const districtEntityId = districtRelationships.get(entityId) ?? null;
    return {
      queue_source: "manual_shell",
      has_scope_row: false,
      district_entity_id: districtEntityId,
      district_name: districtEntityId
        ? stripPublicSchoolDistrictSuffix(
            districtNames.get(districtEntityId) ?? null,
          )
        : null,
      label: row.name ?? null,
      ein: row.ein ?? null,
      entity_id: entityId,
      status: "candidate",
      tier: null,
      org_type: (row.org_type ?? null) as OnboardingQueueRow["org_type"],
      has_entity: true,
      has_irs_org: false,
      has_returns: false,
      latest_return_type: null,
    };
  });

  const normalizedScopeRows = scopeRows.map((row) => ({
    ...row,
    district_name: row.district_entity_id
      ? stripPublicSchoolDistrictSuffix(
          districtNames.get(row.district_entity_id) ?? null,
        )
      : null,
  }));

  return [...normalizedScopeRows, ...manualRows].sort(sortQueueRows);
}
