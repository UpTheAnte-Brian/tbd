import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { supabaseAdmin } from "@/utils/supabase/service-worker";
import type { Database } from "@/database.types";
import type { ScopeStatus, ScopeTier } from "@/app/admin/nonprofits/types";

const TIERS: ScopeTier[] = [
  "registry_only",
  "disclosure_grade",
  "institutional",
];
const STATUSES: ScopeStatus[] = ["candidate", "active", "archived"];

type ScopeUpdate = {
  ein: string;
  tier?: ScopeTier;
  status?: ScopeStatus;
  label?: string | null;
};

type ScopeViewRow =
  Database["public"]["Views"]["v_district_scope_nonprofits"]["Row"];

type ScopeTableUpdate =
  Database["public"]["Tables"]["superintendent_scope_nonprofits"]["Update"];

function asTier(value: unknown): ScopeTier | undefined {
  return TIERS.includes(value as ScopeTier) ? (value as ScopeTier) : undefined;
}

function asStatus(value: unknown): ScopeStatus | undefined {
  return STATUSES.includes(value as ScopeStatus)
    ? (value as ScopeStatus)
    : undefined;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return safeRoute(async () => {
    const { id } = await context.params;
    if (!id) return jsonError("district id is required", 400);

    const { data, error } = await supabaseAdmin
      .from("v_district_scope_nonprofits")
      .select("*")
      .eq("district_entity_id", id)
      .order("scope_label", { ascending: true, nullsFirst: false })
      .order("irs_legal_name", { ascending: true, nullsFirst: false })
      .returns<ScopeViewRow[]>();

    if (error) throw error;
    return NextResponse.json(data ?? []);
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return safeRoute(async () => {
    const { id } = await context.params;
    if (!id) return jsonError("district id is required", 400);

    const body = (await req.json().catch(() => null)) as ScopeUpdate[] | null;
    if (!Array.isArray(body) || body.length === 0) {
      return jsonError("expected an array of updates", 400);
    }

    const updates = body
      .map((row) => {
        const ein = String(row?.ein ?? "").trim();
        if (!ein) return null;
        const tier = asTier(row.tier);
        const status = asStatus(row.status);
        const label = row.label === undefined ? undefined : row.label;
        if (!tier && !status && label === undefined) return null;
        const update: ScopeTableUpdate = {};
        if (tier) update.tier = tier;
        if (status) update.status = status;
        if (label !== undefined) update.label = label;
        return { ein, update };
      })
      .filter(Boolean) as Array<{ ein: string; update: ScopeTableUpdate }>;

    if (updates.length === 0) {
      return jsonError("no valid updates provided", 400);
    }

    const results = await Promise.all(
      updates.map(async ({ ein, update }) => {
        const { data, error } = await supabaseAdmin
          .from("superintendent_scope_nonprofits")
          .update(update)
          .eq("district_entity_id", id)
          .eq("ein", ein)
          .select("*")
          .maybeSingle();

        if (error) throw error;
        return data;
      }),
    );

    return NextResponse.json({ updated: results.length, rows: results });
  });
}
