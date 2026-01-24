import { NextResponse } from "next/server";
import { getChildGeometriesByRelationship } from "@/app/lib/server/entity-geometry-queries";
import { buildFeatureCollectionFromGeometryRows } from "@/app/lib/server/map-geojson";

const ALLOWED_GEOMETRY_TYPE = "school_program_locations";
const RELATIONSHIP_TYPE = "contains";
const CHILD_ENTITY_TYPE = "school";

export async function GET(
  req: Request,
  context: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await context.params;
  const { searchParams } = new URL(req.url);
  const geometryType = searchParams.get("geometry_type");

  if (!geometryType) {
    return NextResponse.json(
      { error: "geometry_type is required" },
      { status: 400 }
    );
  }

  if (geometryType !== ALLOWED_GEOMETRY_TYPE) {
    return NextResponse.json(
      { error: `Unsupported geometry_type: ${geometryType}` },
      { status: 400 }
    );
  }

  try {
    const rows = await getChildGeometriesByRelationship(
      entityId,
      RELATIONSHIP_TYPE,
      CHILD_ENTITY_TYPE,
      geometryType,
      true
    );
    const { featureCollection, returnedCount } =
      buildFeatureCollectionFromGeometryRows(rows, {
        getMeta: (row) => ({
          entity_id: row.entity_id,
          entity_name: row.entity_name ?? null,
          entity_slug: row.entity_slug ?? null,
          entity_type: CHILD_ENTITY_TYPE,
        }),
        getFeatureId: (_feature, row) => row.entity_id ?? undefined,
      });

    if (process.env.NODE_ENV === "development") {
      console.log("map school program locations", {
        entity_id: entityId,
        geometry_type: geometryType,
        returned_count: returnedCount,
      });
    }

    return NextResponse.json(
      {
        level: "school_program_locations",
        featureCollection,
        entity_id: entityId,
        geometry_type: geometryType,
        returned_count: returnedCount,
        geometries: rows,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300",
        },
      }
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to load school program locations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
