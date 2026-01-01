import type {
    Feature,
    FeatureCollection,
    Geometry,
    GeometryCollection,
    Position,
} from "geojson";

export function getBoundsFromGeoJSON(
    input: Feature<Geometry> | FeatureCollection<Geometry>,
): google.maps.LatLngBounds {
    const bounds = new google.maps.LatLngBounds();

    const addCoords = (
        coords: Position | Position[] | Position[][] | Position[][][],
    ) => {
        if (
            typeof coords[0] === "number" &&
            typeof coords[1] === "number"
        ) {
            // It's a Position
            bounds.extend({
                lat: coords[1] as number,
                lng: coords[0] as number,
            });
        } else if (Array.isArray(coords)) {
            // It's an array of deeper coordinates — recurse
            coords.forEach((nested) => {
                // TypeScript will now know nested is one level down
                addCoords(nested as Position | Position[] | Position[][]);
            });
        }
    };

    if (input.type === "FeatureCollection") {
        for (const feature of input.features) {
            const nested = getBoundsFromGeoJSON(feature);
            if (!nested.isEmpty()) {
                bounds.union(nested);
            }
        }
        return bounds;
    }

    const geometry = input.geometry;
    if (!geometry) {
        return bounds;
    }

    switch (geometry.type) {
        case "Point":
        case "MultiPoint":
        case "LineString":
        case "MultiLineString":
        case "Polygon":
        case "MultiPolygon": {
            addCoords(geometry.coordinates);
            break;
        }

        case "GeometryCollection": {
            (geometry as GeometryCollection).geometries.forEach((g) => {
                switch (g.type) {
                    case "Point":
                    case "MultiPoint":
                    case "LineString":
                    case "MultiLineString":
                    case "Polygon":
                    case "MultiPolygon":
                        addCoords(g.coordinates);
                        break;
                }
            });
            break;
        }
    }

    return bounds;
}
