import { NextResponse } from "next/server";
import { getEntityGeometries } from "@/app/lib/server/entity-geometry-queries";
import { buildFeatureCollectionFromGeometryRows } from "@/app/lib/server/map-geojson";

const ALLOWED_GEOMETRY_TYPE = "district_attendance_areas";

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
    const rows = await getEntityGeometries(entityId, [geometryType]);
    const { featureCollection, returnedCount } =
      buildFeatureCollectionFromGeometryRows(rows, {
        getMeta: () => ({
          entity_id: entityId,
        }),
      });

    if (process.env.NODE_ENV === "development") {
      console.log("map attendance areas", {
        entity_id: entityId,
        geometry_type: geometryType,
        returned_count: returnedCount,
      });
    }

    return NextResponse.json(
      {
        level: "attendance_areas",
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
      err instanceof Error ? err.message : "Failed to load attendance areas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
