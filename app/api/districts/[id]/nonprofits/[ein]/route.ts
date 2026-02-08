import { type NextRequest, NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { supabaseAdmin } from "@/utils/supabase/service-worker";
import type { Database } from "@/database.types";
import { isValidEin, normalizeEin } from "@/domain/irs/ein";

type ScopeViewRow =
  Database["public"]["Views"]["v_district_scope_nonprofits"]["Row"];

type ReadyScopeRow = Pick<
  Database["public"]["Views"]["superintendent_scope_nonprofits_ready"]["Row"],
  | "district_entity_id"
  | "ein"
  | "entity_id"
  | "org_type"
  | "has_irs_org"
  | "has_returns"
  | "latest_tax_year"
  | "total_revenue"
  | "total_net_assets"
  | "tax_period_end"
  | "filed_on"
  | "scope_id"
>;

type IrsOrgRow = Database["irs"]["Tables"]["organizations"]["Row"];

type IrsReturnRow = Database["irs"]["Tables"]["returns"]["Row"];

type IrsFinancialRow = Database["irs"]["Tables"]["return_financials"]["Row"];

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; ein: string }> },
) {
  return safeRoute(async () => {
    const { id, ein } = await context.params;
    if (!id) return jsonError("district id is required", 400);
    if (!ein) return jsonError("ein is required", 400);

    const normalizedEin = normalizeEin(ein);
    if (!isValidEin(normalizedEin)) {
      return jsonError("Invalid EIN", 400);
    }

    const { data: scopeRow, error: scopeError } = await supabaseAdmin
      .from("v_district_scope_nonprofits")
      .select("*")
      .eq("district_entity_id", id)
      .eq("ein", normalizedEin)
      .maybeSingle()
      .returns<ScopeViewRow>();

    if (scopeError) throw scopeError;

    const { data: readyRow, error: readyError } = await supabaseAdmin
      .from("superintendent_scope_nonprofits_ready")
      .select(
        "district_entity_id,ein,entity_id,org_type,has_irs_org,has_returns,latest_tax_year,total_revenue,total_net_assets,tax_period_end,filed_on,scope_id",
      )
      .eq("district_entity_id", id)
      .eq("ein", normalizedEin)
      .maybeSingle()
      .returns<ReadyScopeRow>();

    if (readyError) throw readyError;

    const { data: org, error: orgError } = await supabaseAdmin
      .schema("irs")
      .from("organizations")
      .select("*")
      .eq("ein", normalizedEin)
      .maybeSingle()
      .returns<IrsOrgRow>();

    if (orgError) throw orgError;

    let latestReturn: IrsReturnRow | null = null;
    let latestFinancials: IrsFinancialRow | null = null;

    let latestReturnId = org?.latest_return_id ?? null;

    if (!latestReturnId) {
      const { data: latestReturnRow, error: latestReturnError } =
        await supabaseAdmin
          .schema("irs")
          .from("latest_returns")
          .select("id")
          .eq("ein", normalizedEin)
          .order("tax_year", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (latestReturnError) throw latestReturnError;
      latestReturnId = latestReturnRow?.id ?? null;
    }

    if (latestReturnId) {
      const { data: returnRow, error: returnError } = await supabaseAdmin
        .schema("irs")
        .from("returns")
        .select("*")
        .eq("id", latestReturnId)
        .maybeSingle()
        .returns<IrsReturnRow>();

      if (returnError) throw returnError;
      latestReturn = returnRow ?? null;

      if (latestReturn?.id) {
        const { data: financialsRow, error: financialsError } =
          await supabaseAdmin
            .schema("irs")
            .from("return_financials")
            .select("*")
            .eq("return_id", latestReturn.id)
            .maybeSingle()
            .returns<IrsFinancialRow>();

        if (financialsError) throw financialsError;
        latestFinancials = financialsRow ?? null;
      }
    }

    return NextResponse.json({
      scope: scopeRow ?? null,
      organization: org ?? null,
      latest_return: latestReturn,
      latest_financials: latestFinancials,
      health: {
        has_irs_org: readyRow?.has_irs_org ?? scopeRow?.has_irs_org ??
          Boolean(org?.ein),
        has_returns: readyRow?.has_returns ?? scopeRow?.has_returns ??
          Boolean(latestReturn?.id),
        has_entity: scopeRow?.has_entity ?? false,
        filing_recency_days: scopeRow?.filing_recency_days ?? null,
        people_parse_ok: scopeRow?.people_parse_ok ?? null,
        narratives_ok: scopeRow?.narratives_ok ?? null,
      },
    });
  });
}
