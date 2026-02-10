import { resolveDistrictEntityId, resolveEntityId } from "@/app/lib/entities";
import { createClient } from "@/utils/supabase/server";
import type { EntityType } from "@/domain/entities/types";

type ResolveEntityOptions = {
  entityType?: EntityType;
};

// Canonical route resolver: UUID first, then legacy keys (district_id/sdorgid).
export async function resolveEntityIdForRoute(
  entityKey: string,
  options?: ResolveEntityOptions,
): Promise<string> {
  const supabase = await createClient();
  if (!entityKey) {
    throw new Error("Entity id is required");
  }
  if (options?.entityType === "district") {
    return resolveDistrictEntityId(supabase, entityKey);
  }
  return resolveEntityId(supabase, entityKey);
}
