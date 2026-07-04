import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import type { BusinessBookkeepingSnapshot } from "@/domain/business/bookkeeping";
import { createApiClient } from "@/utils/supabase/route";

async function getBookkeepingClient(): Promise<SupabaseClient<Database>> {
  return createApiClient();
}

const EMPTY_SNAPSHOT: BusinessBookkeepingSnapshot = {
  profile: null,
  systems: [],
  accounts: [],
  responsibilities: [],
  closeTemplates: [],
  closePeriods: [],
};

export async function getEntityBookkeepingSnapshot(
  entityId: string,
): Promise<BusinessBookkeepingSnapshot> {
  const supabase = await getBookkeepingClient();
  const rpcClient = supabase as SupabaseClient<any>;
  const { data, error } = await rpcClient.rpc(
    "get_entity_bookkeeping_snapshot",
    {
      p_entity_id: entityId,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data || typeof data !== "object") {
    return EMPTY_SNAPSHOT;
  }

  return {
    ...EMPTY_SNAPSHOT,
    ...(data as Partial<BusinessBookkeepingSnapshot>),
  };
}
