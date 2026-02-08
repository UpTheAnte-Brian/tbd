import { type NextRequest, NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { getNonprofitOnboardingData } from "@/domain/admin/nonprofit-onboarding-dto";
import {
  createIrsAdminClient,
  supabaseAdmin,
} from "@/utils/supabase/service-worker";
import { isValidEin, normalizeEin } from "@/domain/irs/ein";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return safeRoute(async () => {
    if (areAdminToolsDisabled()) {
      return jsonError("Admin routes are disabled.", 403);
    }

    const { id } = await context.params;
    if (!id) {
      return jsonError("entity_id is required", 400);
    }

    const scopeId = req.nextUrl.searchParams.get("scope_id");
    const body = (await req.json().catch(() => null)) as
      | { ein?: string | null }
      | null;

    let ein = body?.ein ?? null;
    if (!ein) {
      const snapshot = await getNonprofitOnboardingData(id);
      ein = snapshot.nonprofit?.ein ?? null;
    }

    if (!ein) {
      return jsonError("EIN is required to link IRS organization", 400);
    }

    const rawEin = ein.trim();
    if (!isValidEin(rawEin)) {
      return jsonError("Invalid EIN", 400);
    }

    const einNormalized = normalizeEin(rawEin);
    const supabase = supabaseAdmin;
    const irs = createIrsAdminClient();

    const { data: orgRow, error: orgErr } = await irs
      .from("organizations")
      .select("ein, legal_name, website, city, state, country")
      .eq("ein", einNormalized)
      .maybeSingle();

    if (orgErr) {
      throw new Error(orgErr.message);
    }

    if (!orgRow) {
      console.error("IRS org lookup failed", {
        rawEin,
        einNormalized,
      });
      return jsonError("IRS organization not found for EIN", 404);
    }

    const canonicalEin = orgRow.ein;

    const { error: linkErr } = await irs.from("entity_links").upsert(
      {
        entity_id: id,
        ein: canonicalEin,
        match_type: "manual",
        confidence: 100,
      },
      { onConflict: "ein" },
    );

    if (linkErr) {
      throw new Error(linkErr.message);
    }

    // Mark scope row active. Prefer scope_id (precise) and also backfill entity_id when we have it.
    if (scopeId) {
      const { error: scopeError } = await supabase
        .from("superintendent_scope_nonprofits")
        .update({ status: "active", entity_id: id })
        .eq("id", scopeId);

      if (scopeError) {
        throw new Error(scopeError.message);
      }
    } else {
      const { error: scopeError } = await supabase
        .from("superintendent_scope_nonprofits")
        .update({ status: "active" })
        .eq("entity_id", id);

      if (scopeError) {
        throw new Error(scopeError.message);
      }
    }

    const { error: progressError } = await supabase
      .from("entity_onboarding_progress")
      .upsert(
        {
          entity_id: id,
          section: "irs_link",
          status: "complete",
          last_updated: new Date().toISOString(),
        },
        { onConflict: "entity_id,section" },
      );

    if (progressError) {
      throw new Error(progressError.message);
    }
    const payload = await getNonprofitOnboardingData(id, scopeId);
    return NextResponse.json<typeof payload>(payload);
  });
}
