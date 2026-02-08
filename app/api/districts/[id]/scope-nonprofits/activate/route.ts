import { type NextRequest, NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { supabaseAdmin } from "@/utils/supabase/service-worker";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return safeRoute(async () => {
    const { id } = await context.params;
    if (!id) return jsonError("district id is required", 400);

    const body = (await req.json().catch(() => null)) as
      | { eins?: string[] | null }
      | null;

    const eins = Array.isArray(body?.eins)
      ? body!.eins
        .map((ein) => String(ein ?? "").trim())
        .filter(Boolean)
      : null;

    const { data, error } = await supabaseAdmin.rpc(
      "activate_scoped_nonprofits",
      {
        p_district_entity_id: id,
        p_eins: eins && eins.length ? eins : undefined,
      },
    );

    if (error) throw error;

    // The RPC returns an array (per-district run summary). For convenience, enrich the
    // payload with the created/linked entity_id(s) so the UI can redirect immediately.
    const summary = Array.isArray(data) ? data[0] : data;

    const activatedEins = Array.isArray(summary?.activated_eins)
      ? (summary.activated_eins as string[])
      : [];

    let activated_entities: Array<{ ein: string; entity_id: string }> = [];
    let activated_scopes: Array<{
      ein: string;
      org_type: string | null;
      entity_id: string | null;
    }> = [];

    if (activatedEins.length) {
      const { data: links, error: linksError } = await supabaseAdmin
        .schema("irs")
        .from("entity_links")
        .select("ein, entity_id")
        .in("ein", activatedEins);

      if (linksError) throw linksError;

      activated_entities = (links ?? [])
        .filter((r) => r?.ein && r?.entity_id)
        .map((r) => ({ ein: String(r.ein), entity_id: String(r.entity_id) }));

      const { data: scopeRows, error: scopeError } = await supabaseAdmin
        .from("superintendent_scope_nonprofits")
        .select("ein, org_type, entity_id")
        .eq("district_entity_id", id)
        .in("ein", activatedEins);

      if (scopeError) throw scopeError;

      activated_scopes = (scopeRows ?? []).map((row) => ({
        ein: String(row.ein),
        org_type: row.org_type ?? null,
        entity_id: row.entity_id ?? null,
      }));
    }

    return NextResponse.json({
      ...(summary ?? {}),
      activated_entities,
      activated_scopes,
      // keep backwards-compat: if caller expects the old array shape
      ...(Array.isArray(data) ? { _raw: data } : {}),
    });
  });
}
