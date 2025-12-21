import { Feature, Geometry } from "geojson";
import { DistrictFeature, DistrictProperties } from "../types/types";

export function getLabel(
    feature: Feature<Geometry, DistrictProperties>,
): string | null {
    // Adjust based on your actual property keys
    return feature.properties?.shortname || feature.properties?.sdorgid || null;
}

export function getLabelPosition(
    feature: DistrictFeature,
): google.maps.LatLng | null {
    const geom = feature.geometry;

    if (geom.type === "Polygon") {
        const coords = geom.coordinates[0];
        return new google.maps.LatLng(...getPolygonCentroid(coords));
    }

    if (geom.type === "MultiPolygon") {
        const outerRing = geom.coordinates[0][0];
        return new google.maps.LatLng(...getPolygonCentroid(outerRing));
    }

    // fallback
    return new google.maps.LatLng(
        feature.properties?.centroid_lat || 45,
        feature.properties?.centroid_lng || -93,
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
