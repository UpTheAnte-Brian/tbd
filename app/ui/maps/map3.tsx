"use client";

import React, { useState, useCallback } from "react";
import { GoogleMap, KmlLayer, useLoadScript } from "@react-google-maps/api";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const containerStyle = {
  width: "100%",
  height: "80vh",
};

const center = {
  lat: 44.745,
  lng: -93.523,
};

function MapComponent() {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  console.log("MapComponent", map);

  const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
  });

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading Maps</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={9}
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
