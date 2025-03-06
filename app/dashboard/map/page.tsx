"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { GoogleMap, KmlLayer, Marker } from "@react-google-maps/api";
import Places from "@/app/ui/maps/places";
import React from "react";

type LatLngLiteral = google.maps.LatLngLiteral;
type MapOptions = google.maps.MapOptions;
// const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// function loadScript(src: string, position: HTMLElement) {
//   const script = document.createElement("script");
//   script.setAttribute("async", "");
//   script.src = src;
//   position.appendChild(script);
//   return script;
// }

export default function MapPage() {
  const [point, setPoint] = useState<LatLngLiteral | null>(null);
  // const callbackId = React.useId().replace(/:/g, "");
  // const [loaded, setLoaded] = React.useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const center = useMemo<LatLngLiteral>(
    () => ({
      lat: 44.745,
      lng: -93.523,
    }),
    []
  );

  const options = useMemo<MapOptions>(
    () => ({
      disableDefaultUI: false,
      zoomControl: true,
      clickableIcons: false,
      mapId: "74d818485994559a",
    }),
    []
  );

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-full">
      <div className="w-full">
        <GoogleMap
          zoom={10}
          center={center}
          options={options}
          onLoad={onLoad}
          onUnmount={onUnmount}
          mapContainerStyle={{ width: "100%", height: "80svh" }}
        >
          <KmlLayer
            url="https://www.google.com/maps/d/u/0/kml?mid=1FKYPSCOodzmWDszKJYHUrSL0jKpeVMc&lid=i9NuWw-UIno"
            options={{
              suppressInfoWindows: false,
              preserveViewport: true,
            }}
          />
          {point && <Marker position={point} />}
          <div className="absolute overflow-auto p-4 bg-black bg-opacity-80 text-white top-14 left-2.5 w-64">
            <h1>Search</h1>
            <Places
              setPoint={(position) => {
                setPoint(position);
                mapRef.current?.panTo(position);
              }}
            />
          </div>
        </GoogleMap>
      </div>
    </div>
  );
}
