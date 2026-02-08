import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import type { ScopeSummary } from "@/app/components/districts/superintendent/types";

function getServiceRoleSupabaseClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    process.env.SUPABASE_PROJECT_URL;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase env vars for superintendent summary. Expected NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeEinDigits(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  return digits.length === 9 ? digits : null;
}

async function countByStatus(
  supabase: SupabaseClient<Database>,
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
  supabase: SupabaseClient<Database>,
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

  const supabase = getServiceRoleSupabaseClient();
  const [inScope, active, candidate] = await Promise.all([
    countByStatus(supabase, districtEntityId, ["candidate", "active"]),
    countByStatusValue(supabase, districtEntityId, "active"),
    countByStatusValue(supabase, districtEntityId, "candidate"),
  ]);

  const { data: scoped, error: scopedError } = await supabase
    .from("superintendent_scope_nonprofits")
    .select("ein")
    .eq("district_entity_id", districtEntityId)
    .in("status", ["candidate", "active"]);

  if (scopedError) {
    throw new Error(scopedError.message);
  }

  const einDigits = Array.from(
    new Set(
      (scoped ?? [])
        .map((row) => normalizeEinDigits(row.ein ?? null))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  let totalRevenue = 0;
  let totalNetAssets = 0;

  if (einDigits.length > 0) {
    const irs = (supabase as SupabaseClient<Database>).schema("irs");

    const { data, error } = await irs
      .from("latest_financials")
      .select("total_revenue, net_assets_end")
      .in("ein", einDigits);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      const rev = typeof row.total_revenue === "number"
        ? row.total_revenue
        : Number(row.total_revenue ?? 0);
      const net = typeof row.net_assets_end === "number"
        ? row.net_assets_end
        : Number(row.net_assets_end ?? 0);

      if (Number.isFinite(rev)) totalRevenue += rev;
      if (Number.isFinite(net)) totalNetAssets += net;
    }
  }

  return {
    nonprofits_in_scope: inScope,
    nonprofits_active: active,
    nonprofits_candidate: candidate,
    total_revenue: totalRevenue,
    total_net_assets: totalNetAssets,
  };
}
