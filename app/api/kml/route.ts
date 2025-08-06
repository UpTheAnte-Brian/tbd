// app/api/kml/route.ts
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { createClient } from "@supabase/supabase-js";

type Geometry =
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] };
interface GeoJSONFeature {
    type: "Feature";
    properties: Record<string, string>;
    geometry: Geometry;
}
const KMZ_URL =
    "https://www.google.com/maps/d/u/0/kml?mid=1FKYPSCOodzmWDszKJYHUrSL0jKpeVMc&lid=i9NuWw-UIno";

/* ──────────────── Types ──────────────── */

interface PlacemarkXML {
    name?: string;
    ExtendedData?: {
        Data: { "@_name": string; value: string } | {
            "@_name": string;
            value: string;
        }[];
    };
    Polygon?: PolygonXML;
    MultiGeometry?: { Polygon: PolygonXML };
}

interface PolygonXML {
    outerBoundaryIs?: { LinearRing: { coordinates: string } };
    LinearRing?: { coordinates: string };
}

/* ──────────────── Utils ──────────────── */

const parseCoordinates = (text: string): number[][] =>
    text
        .trim()
        .split(/\s+/)
        .map((pair) =>
            pair.split(",").slice(0, 2).map(Number) as [number, number]
        );

/* ──────────────── Optional Supabase ──────────────── */

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
    )
    : null;

/* ──────────────── API handler ──────────────── */

export async function GET() {
    /* 1️⃣ download KMZ */
    // const now = new Date()
    const res = await fetch(KMZ_URL);
    if (!res.ok) {
        return NextResponse.json({ error: "Failed to fetch KMZ" }, {
            status: 502,
        });
    }
    const kmzBuffer = await res.arrayBuffer();
    // console.log("time for fetch: ", (new Date() - now))
    /* 2️⃣ unzip → .kml */
    const zip = await JSZip.loadAsync(kmzBuffer);
    const kmlText = await zip.file(/\.kml$/i)?.[0]?.async("string");
    if (!kmlText) {
        return NextResponse.json({ error: "doc.kml not found" }, {
            status: 500,
        });
    }

    /* 3️⃣ parse XML */
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
    });
    const kml = parser.parse(kmlText) as {
        kml: { Document: { Placemark: PlacemarkXML | PlacemarkXML[] } };
    };

    const placemarks = Array.isArray(kml.kml.Document.Placemark)
        ? kml.kml.Document.Placemark
        : [kml.kml.Document.Placemark];

    /* 4️⃣ build GeoJSON with ExtendedData */
    const features: GeoJSONFeature[] = placemarks.map((p) => {
        // Build properties from ExtendedData
        const ext = p.ExtendedData?.Data;
        const extArray = Array.isArray(ext) ? ext : ext ? [ext] : [];
        const extProps = Object.fromEntries(
            extArray.map((d) => [d["@_name"], d.value]),
        );

        // Unique key
        const sdorgid = extProps["sdorgid"] ?? crypto.randomUUID();

        const poly = p.Polygon;
        const multi = p.MultiGeometry?.Polygon;
        let geometry: Geometry; // <-- tell TS this will be one of the union cases

        if (poly) {
            const coordsText = poly.outerBoundaryIs?.LinearRing?.coordinates ??
                poly.LinearRing?.coordinates ??
                "";
            geometry = {
                type: "Polygon",
                coordinates: [parseCoordinates(coordsText)],
            };
        } else if (multi) {
            const polys = Array.isArray(multi) ? multi : [multi];
            const rings = polys.map((pg) => {
                const coordsText =
                    pg.outerBoundaryIs?.LinearRing?.coordinates ??
                        pg.LinearRing?.coordinates ??
                        "";
                return [parseCoordinates(coordsText)];
            });
            geometry = {
                type: "MultiPolygon",
                coordinates: rings,
            };
        } else {
            geometry = { type: "Polygon", coordinates: [] }; // fallback
        }

        return {
            type: "Feature",
            properties: { sdorgid, name: p.name ?? "", ...extProps },
            geometry,
        };
    });

    /* 5️⃣ upsert into Supabase on sdorgid */
    if (supabase) {
        await supabase
            .from("districts")
            .upsert(
                features.map((f) => ({
                    sdorgid: f.properties.sdorgid,
                    name: f.properties.name,
                    geojson: f,
                })),
                { onConflict: "sdorgid" },
            )
            .throwOnError();
    }

    /* 6️⃣ respond */
    return NextResponse.json(
        { type: "FeatureCollection", features },
        { status: 200, headers: { "Cache-Control": "s-maxage=3600" } },
    );
}
