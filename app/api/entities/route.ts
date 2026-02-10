import { NextRequest, NextResponse } from "next/server";
import type { EntityType } from "@/domain/entities/types";
import { listEntityDirectoryRows } from "@/domain/entities/entity-directory-dto";

// GET /api/entities?type=district|business|nonprofit
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const typeParam = searchParams.get("type");

  const types = typeParam
    ? typeParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  const allowedTypes: EntityType[] = ["district", "business", "nonprofit"];
  const filteredTypes = types.filter((value): value is EntityType =>
    allowedTypes.includes(value as EntityType),
  );

  const rows = await listEntityDirectoryRows(
    filteredTypes.length ? filteredTypes : undefined,
  );
  return NextResponse.json(rows);
}
