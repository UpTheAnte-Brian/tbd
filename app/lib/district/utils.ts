import { Feature, Geometry } from "geojson";
import { DistrictProperties, ExtendedFeature } from "../types";

export function getLabel(
    feature: Feature<Geometry, DistrictProperties>,
): string | null {
    // Adjust based on your actual property keys
    return feature.properties?.shortname || feature.properties?.sdorgid || null;
}

export function getLabelPosition(
    feature: ExtendedFeature,
): google.maps.LatLngLiteral | null {
    // const geom = feature.geometry;

    // if (geom.type === "Polygon") {
    //     const coords = geom.coordinates[0]; // outer ring
    //     return averageLatLng(coords);
    // }

    // if (geom.type === "MultiPolygon") {
    //     const coords = geom.coordinates[0][0]; // first polygon’s outer ring
    //     return averageLatLng(coords);
    // }

    return {
        lat: feature.centroid_lat || 45,
        lng: feature.centroid_lng || -93,
    };
}

// Basic centroid approximation (by averaging coordinates)
// function averageLatLng(coords: number[][]): google.maps.LatLngLiteral {
//     const [sumLng, sumLat] = coords.reduce(
//         ([lngSum, latSum], [lng, lat]) => [lngSum + lng, latSum + lat],
//         [0, 0],
//     );
//     const count = coords.length;
//     return {
//         lat: sumLat / count,
//         lng: sumLng / count,
//     };
// }

export const panToMinnesota = (map: google.maps.Map) => {
    map.setZoom(6);
    map.panTo({ lat: 46.3, lng: -94.3 }); // Center of MN
};
