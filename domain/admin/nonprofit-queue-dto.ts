import "server-only";

import type { Database } from "@/database.types";
import { supabaseAdmin } from "@/utils/supabase/service-worker";
import type { OnboardingQueueRow } from "@/app/admin/nonprofits/types";
import { stripPublicSchoolDistrictSuffix } from "@/app/lib/utils/districts";

type ScopeQueueRow =
  Database["public"]["Views"]["v_district_scope_nonprofits"]["Row"];
type EntityRow = Database["public"]["Tables"]["entities"]["Row"];

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

  const districtEntityIds = Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.district_entity_id)
        .filter((value): value is string => Boolean(value)),
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

  return (data ?? [])
    .map((row) => ({
      district_entity_id: row.district_entity_id ?? null,
      district_name: row.district_entity_id
        ? stripPublicSchoolDistrictSuffix(
          districtNames.get(row.district_entity_id) ?? null,
        )
        : null,
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
    }))
    .sort((a, b) => {
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
    });
}
