"use client";

import { useEffect, useRef } from "react";

export default function PlaceMap({ placeId }: { placeId: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !placeId) return;

    (async () => {
      const { Map } = (await google.maps.importLibrary(
        "maps"
      )) as google.maps.MapsLibrary;

      const map = new Map(ref.current!, {
        zoom: 15,
      });

      const service = new google.maps.places.PlacesService(map);

      service.getDetails({ placeId }, (place) => {
        if (!place?.geometry?.location) return;
        map.setCenter(place.geometry.location);
        new google.maps.Marker({
          map,
          position: place.geometry.location,
        });
      });
    })();
  }, [placeId]);

  return <div ref={ref} className="w-full h-64 rounded border" />;
}
