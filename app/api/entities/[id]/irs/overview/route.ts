import { NextResponse } from "next/server";
import type { Database } from "@/database.types";
import { resolveEntityId } from "@/app/lib/entities";
import { supabaseAdmin } from "@/utils/supabase/service-worker";

type LatestReturnRow = Database["irs"]["Views"]["latest_returns"]["Row"];

type IrsOverviewEntry = {
  ein: string;
  latest_tax_year: number | null;
  latest_return_type: Database["irs"]["Enums"]["irs_return_type"] | null;
  returns_count: number;
};

// GET /api/entities/[id]/irs/overview
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Entity id is required" }, { status: 400 });
  }

  const entityId = await resolveEntityId(supabaseAdmin, id);
  const { data: links, error: linksError } = await supabaseAdmin
    .schema("irs")
    .from("entity_links")
    .select("ein")
    .eq("entity_id", entityId);

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  const eins = Array.from(
    new Set(
      (links ?? [])
        .map((row) => row?.ein)
        .filter((value): value is string => typeof value === "string")
        .filter((value) => value.trim().length > 0)
    )
  );

  if (eins.length === 0) {
    return NextResponse.json({ eins: [], summary: [] });
  }

  const { data: latestReturns, error: latestError } = await supabaseAdmin
    .schema("irs")
    .from("latest_returns")
    .select("ein, tax_year, return_type")
    .in("ein", eins)
    .returns<LatestReturnRow[]>();

  if (latestError) {
    return NextResponse.json({ error: latestError.message }, { status: 500 });
  }

  const returnsByEin = new Map<string, LatestReturnRow>();
  (latestReturns ?? []).forEach((row) => {
    if (row.ein) {
      returnsByEin.set(String(row.ein), row);
    }
  });

  const counts = await Promise.all(
    eins.map(async (ein) => {
      const { count, error } = await supabaseAdmin
        .schema("irs")
        .from("returns")
        .select("id", { count: "exact", head: true })
        .eq("ein", ein);
      if (error) {
        return { ein, count: 0 };
      }
      return { ein, count: count ?? 0 };
    })
  );

  const countByEin = new Map<string, number>(
    counts.map((row) => [row.ein, row.count])
  );

  const summary: IrsOverviewEntry[] = eins.map((ein) => {
    const latest = returnsByEin.get(ein) ?? null;
    return {
      ein,
      latest_tax_year: latest?.tax_year ?? null,
      latest_return_type: latest?.return_type ?? null,
      returns_count: countByEin.get(ein) ?? 0,
    };
  });

  return NextResponse.json({ eins, summary });
}
