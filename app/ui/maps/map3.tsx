"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import { GoogleMap, KmlLayer } from "@react-google-maps/api";
import useGoogleMaps from "../../lib/map-context";
type MapOptions = google.maps.MapOptions;
type LatLngLiteral = google.maps.LatLngLiteral;
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const containerStyle = {
  width: "100%",
  height: "80vh",
};

function MapComponent() {
  // const { isLoaded, loadError } = useGoogleMaps(apiKey);

  // if (loadError) return "Error loading maps";
  // if (!isLoaded) return "Loading Maps";
  const [map, setMap] = useState<google.maps.Map | null>(null);
  console.log("MapComponent", map);

  const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  // const mapRef = useRef<GoogleMap>(null);

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

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={9}
      options={options}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      <KmlLayer
        url="https://www.google.com/maps/d/u/0/kml?mid=1FKYPSCOodzmWDszKJYHUrSL0jKpeVMc&lid=i9NuWw-UIno"
        options={{
          suppressInfoWindows: false,
          preserveViewport: true,
        }}
      />
    </GoogleMap>
  );
}

export default React.memo(MapComponent);
