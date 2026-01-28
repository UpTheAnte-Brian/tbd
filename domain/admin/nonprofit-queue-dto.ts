import "server-only";

import type { Database } from "@/database.types";
import { supabaseAdmin } from "@/utils/supabase/service-worker";
import type { OnboardingQueueRow } from "@/app/admin/nonprofits/types";

type ScopeReadyRow =
  Database["public"]["Views"]["superintendent_scope_nonprofits_ready"]["Row"];

type ScopeStatus = "candidate" | "active" | "archived" | string;

type NextStep = OnboardingQueueRow["next_step"];

function resolveNextStep(row: ScopeReadyRow): NextStep {
  const hasEntity = Boolean(row.has_entity);
  const hasIrsLink = Boolean(row.has_irs_link);
  const status = (row.status ?? "") as ScopeStatus;

  if (!hasEntity) return "create_entity";
  if (!hasIrsLink) return "link_irs";
  if (status !== "active") return "verify";
  return "unknown";
}

function buildActionUrl(row: ScopeReadyRow, nextStep: NextStep): string {
  if (nextStep === "create_entity" || !row.entity_id) {
    return `/admin/nonprofits/new?scope_id=${row.id}`;
  }
  return `/admin/nonprofits/${row.entity_id}/onboarding?scope_id=${row.id}`;
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

  return (data ?? []).map((row) => {
    const next_step = resolveNextStep(row);
    return {
      scope_id: String(row.id),
      district_entity_id: row.district_entity_id ?? null,
      label: row.label ?? null,
      ein: row.ein ?? null,
      entity_id: row.entity_id ?? null,
      status: (row.status ?? "candidate") as OnboardingQueueRow["status"],
      has_entity: Boolean(row.has_entity),
      has_irs_link: Boolean(row.has_irs_link),
      has_returns: Boolean(row.has_returns),
      is_ready: Boolean(row.is_ready),
      next_step,
      action_url: buildActionUrl(row, next_step),
    };
  });
}
