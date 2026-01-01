import type { Geometry } from "geojson";

export function getLabel(
    feature: {
        properties?: Record<string, unknown> | null;
    },
): string | null {
    const asString = (val: unknown): string | null =>
        typeof val === "string" ? val : null;
    // Adjust based on your actual property keys
    return (
        asString(feature.properties?.name) ||
        asString(feature.properties?.slug) ||
        asString(feature.properties?.entity_id) ||
        null
    );
}

export function getLabelPosition(
    feature: {
        geometry?: Geometry | null;
        properties?: Record<string, unknown> | null;
        centroid_lat?: number | null;
        centroid_lng?: number | null;
    },
): google.maps.LatLng | null {
    const geom = feature.geometry;

    if (geom?.type === "Polygon") {
        const coords = geom.coordinates[0];
        return new google.maps.LatLng(...getPolygonCentroid(coords));
    }

    if (geom?.type === "MultiPolygon") {
        const outerRing = geom.coordinates[0][0];
        return new google.maps.LatLng(...getPolygonCentroid(outerRing));
    }

    // fallback
    const props = feature.properties ?? {};
    const lat =
        (typeof feature.centroid_lat === "number" && feature.centroid_lat) ||
        (typeof props.centroid_lat === "number" && props.centroid_lat) ||
        45;
    const lng =
        (typeof feature.centroid_lng === "number" && feature.centroid_lng) ||
        (typeof props.centroid_lng === "number" && props.centroid_lng) ||
        -93;
    return new google.maps.LatLng(
        lat,
        lng,
    );
}

// Updated polygon centroid to return [lat, lng] tuple for LatLng
function getPolygonCentroid(coords: number[][]): [number, number] {
    let area = 0,
        x = 0,
        y = 0;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const [lng0, lat0] = coords[i];
        const [lng1, lat1] = coords[j];
        const f = lng0 * lat1 - lng1 * lat0;
        x += (lng0 + lng1) * f;
        y += (lat0 + lat1) * f;
        area += f;
    }
    area *= 0.5;
    x /= 6 * area;
    y /= 6 * area;
    return [y, x]; // [lat, lng] order for LatLng
}

export const panToMinnesota = (map: google.maps.Map) => {
    map.setZoom(6);
    map.panTo({ lat: 46.3, lng: -94.3 }); // Center of MN
};
