import "server-only";

import type { Database } from "@/database.types";
import { supabaseAdmin } from "@/utils/supabase/service-worker";
import type { OnboardingQueueRow } from "@/app/admin/nonprofits/types";

type ScopeQueueRow =
  Database["public"]["Views"]["v_district_scope_nonprofits"]["Row"];

export async function getOnboardingQueue(): Promise<OnboardingQueueRow[]> {
  const { data, error } = await supabaseAdmin
    .from("v_district_scope_nonprofits")
    .select(
      "district_entity_id, ein, scope_label, tier, status, has_entity, entity_id, irs_legal_name, has_irs_org, has_returns",
    )
    .neq("status", "archived")
    .order("scope_label", { ascending: true, nullsFirst: false })
    .order("irs_legal_name", { ascending: true, nullsFirst: false })
    .returns<ScopeQueueRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    district_entity_id: row.district_entity_id ?? null,
    label: row.scope_label ?? row.irs_legal_name ?? null,
    ein: row.ein ?? null,
    entity_id: row.entity_id ?? null,
    status: (row.status ?? null) as OnboardingQueueRow["status"],
    tier: (row.tier ?? null) as OnboardingQueueRow["tier"],
    has_entity: Boolean(row.has_entity),
    has_irs_org: Boolean(row.has_irs_org),
    has_returns: Boolean(row.has_returns),
  }));
}
