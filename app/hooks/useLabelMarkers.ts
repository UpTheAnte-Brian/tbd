import { useEffect, useRef } from "react";
import { getLabel, getLabelPosition } from "../lib/district/utils";
import { ExtendedFeature } from "../lib/types/types";

interface UseLabelMarkersProps {
    mapRef: React.RefObject<google.maps.Map | null>;
    features: ExtendedFeature[];
    zoom: number;
    selectedId: string | null;
    onClickFeature?: (feature: ExtendedFeature) => void;
}

export function useLabelMarkers({
    mapRef,
    features,
    zoom,
    selectedId,
    onClickFeature,
}: UseLabelMarkersProps) {
    const labelMarkersRef = useRef<google.maps.Marker[]>([]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !features?.length) return;

        // Clear old markers
        labelMarkersRef.current.forEach((marker) => marker.setMap(null));
        labelMarkersRef.current = [];

        // Optionally filter based on zoom level
        if (zoom < 9) return;

        for (const feature of features) {
            const position = getLabelPosition(feature);
            const label = getLabel(feature);
            if (!position || !label) continue;

            const marker = new google.maps.Marker({
                position,
                map,
                label: {
                    text: label,
                    fontSize: "12px",
                    fontWeight: "bold",
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 0, // hides the icon but shows the label
                },
                title: label,
            });

            marker.addListener("click", () => {
                onClickFeature?.(feature);
            });

            labelMarkersRef.current.push(marker);
        }
    }, [mapRef.current, features, zoom, selectedId]);
    return labelMarkersRef;
}
