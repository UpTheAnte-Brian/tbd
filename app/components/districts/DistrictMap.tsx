"use client";
import { GoogleMap, Polygon } from "@react-google-maps/api";
import { useEffect, useRef, useState } from "react";
import { DistrictWithFoundation, PlaceDetailsType } from "@/app/lib/types";
import { getBoundsFromGeoJSON } from "@/app/lib/getBoundsFromGeoJSON";
import PlaceDetails from "@/app/components/places/PlaceDetails";

type PlaceClickEvent = google.maps.MapMouseEvent & { placeId?: string };

const containerStyle = {
  width: "100%",
  height: "400px",
};

export default function DistrictMap({ d }: { d: DistrictWithFoundation }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [paths, setPaths] = useState<google.maps.LatLngLiteral[][]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetailsType | null>(
    null
  );

  // Convert GeoJSON coords → LatLngLiterals
  useEffect(() => {
    if (!d.geometry) return;
    if (d.geometry.type === "Polygon") {
      const coords = d.geometry.coordinates[0].map(([lng, lat]) => ({
        lat,
        lng,
      }));
      setPaths([coords]);
    } else if (d.geometry.type === "MultiPolygon") {
      const multi = d.geometry.coordinates.map((poly) =>
        poly[0].map(([lng, lat]) => ({ lat, lng }))
      );
      setPaths(multi);
    }
  }, [d]);

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;

    // prevent default POI info window and show custom place details
    map.addListener("click", (e: PlaceClickEvent) => {
      if (e.placeId && mapRef.current) {
        e.stop();
        const service = new google.maps.places.PlacesService(mapRef.current);
        service.getDetails({ placeId: e.placeId }, (placeResult, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            placeResult
          ) {
            setSelectedPlace({
              name: placeResult.name || "Unknown Place",
              formatted_address: placeResult.formatted_address,
              formatted_phone_number: placeResult.formatted_phone_number,
              place_id: placeResult.place_id,
              website: placeResult.website,
              rating: placeResult.rating,
              user_ratings_total: placeResult.user_ratings_total,
            });
          }
        });
      }
    });

    const bounds = getBoundsFromGeoJSON(d);
    map.fitBounds(bounds);
  };
  const worldCoords = [
    { lat: -85, lng: -180 },
    { lat: 85, lng: -180 },
    { lat: 85, lng: 180 },
    { lat: -85, lng: 180 },
  ];

  const placeholderPlace = {
    name: "Select a place",
    formatted_address: "Address will appear here",
    formatted_phone_number: "(000) 000-0000",
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full">
      <div className="w-full md:w-3/4 h-full">
        <GoogleMap
          mapContainerStyle={containerStyle}
          onLoad={onLoad}
          options={{
            mapTypeId: "roadmap",
            disableDefaultUI: true,
            styles: [
              {
                featureType: "all",
                elementType: "geometry",
                stylers: [{ visibility: "off" }],
              },
              {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ visibility: "on" }, { color: "#e0f7fa" }],
              },
            ],
          }}
        >
          <Polygon
            paths={[worldCoords, ...paths.map((p) => [...p].reverse())]}
            options={{
              fillColor: "black",
              fillOpacity: 0.5,
              strokeWeight: 0,
              clickable: false, // mask should not capture clicks
            }}
          />
          {paths.map((p, idx) => (
            <Polygon
              key={idx}
              paths={p}
              options={{
                fillOpacity: 0,
                strokeColor: "#1976D2",
                strokeWeight: 2,
                clickable: false,
              }}
            />
          ))}
        </GoogleMap>
      </div>
      <PlaceDetails
        place={selectedPlace ?? placeholderPlace}
        onClose={() => setSelectedPlace(null)}
      />
    </div>
  );
}
