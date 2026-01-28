import { type NextRequest, NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { getNonprofitOnboardingData } from "@/domain/admin/nonprofit-onboarding-dto";
import { createApiClient } from "@/utils/supabase/route";
import { isValidEin, normalizeEin } from "@/domain/irs/ein";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return safeRoute(async () => {
    if (process.env.NODE_ENV === "production") {
      return jsonError("Admin routes are disabled in production.", 403);
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
    const supabase = await createApiClient();
    const irs = supabase.schema("irs");

    // PostgREST filter values with special characters (like EIN dashes) must be quoted.
    // See: https://postgrest.org/en/stable/references/api/tables_views.html#operators
    const rawEinQuoted = JSON.stringify(rawEin); // produces a double-quoted, escaped string
    const einNormalizedQuoted = JSON.stringify(einNormalized);

    const { data: orgRow, error: orgErr } = await irs
      .from("organizations")
      .select("ein, ein_normalized, legal_name, website, city, state, country")
      .or(`ein.eq.${rawEinQuoted},ein_normalized.eq.${einNormalizedQuoted}`)
      .maybeSingle();

    if (orgErr) {
      throw new Error(orgErr.message);
    }

    if (!orgRow) {
      console.error("IRS org lookup failed", {
        rawEin,
        einNormalized,
        rawEinQuoted,
        einNormalizedQuoted,
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

    const { error: scopeError } = await supabase
      .from("superintendent_scope_nonprofits")
      .update({ status: "active" })
      .eq("entity_id", id);

    if (scopeError) {
      throw new Error(scopeError.message);
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
