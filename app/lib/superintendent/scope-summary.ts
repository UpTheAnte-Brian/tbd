import "server-only";

import { createApiClient } from "@/utils/supabase/route";
import type { ScopeSummary } from "@/app/components/districts/superintendent/types";

async function countByStatus(
  supabase: Awaited<ReturnType<typeof createApiClient>>,
  districtEntityId: string,
  statuses: string[],
): Promise<number> {
  const { count, error } = await supabase
    .from("superintendent_scope_nonprofits")
    .select("id", { count: "exact", head: true })
    .eq("district_entity_id", districtEntityId)
    .in("status", statuses);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countByStatusValue(
  supabase: Awaited<ReturnType<typeof createApiClient>>,
  districtEntityId: string,
  status: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("superintendent_scope_nonprofits")
    .select("id", { count: "exact", head: true })
    .eq("district_entity_id", districtEntityId)
    .eq("status", status);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getScopeSummary(
  districtEntityId: string,
): Promise<ScopeSummary> {
  if (!districtEntityId) {
    throw new Error("districtEntityId is required");
  }

  const supabase = await createApiClient();
  const [inScope, active, candidate] = await Promise.all([
    countByStatus(supabase, districtEntityId, ["candidate", "active"]),
    countByStatusValue(supabase, districtEntityId, "active"),
    countByStatusValue(supabase, districtEntityId, "candidate"),
  ]);

  return {
    nonprofits_in_scope: inScope,
    nonprofits_active: active,
    nonprofits_candidate: candidate,
  };
}
