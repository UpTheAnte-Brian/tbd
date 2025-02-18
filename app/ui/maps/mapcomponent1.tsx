"use client";

import React, { useState, useCallback } from "react";
import { GoogleMap, KmlLayer } from "@react-google-maps/api";
import { useLoadScript } from "@react-google-maps/api";

const containerStyle = {
  display: "flex",
  height: "80vh",
};

const center = {
  lat: 44.745,
  lng: -93.523,
};

function MapComponent() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });
  const [map, setMap] = useState(null);
  console.log("MapComponent", map);

  const onLoad = useCallback(function callback(mapInstance: any) {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={10}
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

export default MapComponent;
