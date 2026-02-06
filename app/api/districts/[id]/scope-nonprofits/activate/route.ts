import { NextResponse, type NextRequest } from "next/server";
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
    return NextResponse.json(data);
  });
}
