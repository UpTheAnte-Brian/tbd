"use client";
import React from "react";
import { GoogleMap, KmlLayer, useJsApiLoader } from "@react-google-maps/api";

type LatLngLiteral = google.maps.LatLngLiteral;
type KmlLayerOptions = google.maps.KmlLayerOptions;
type MapOptions = google.maps.MapOptions;

const containerStyle = {
  display: "flex",
  height: "80vh",
};

const center = {
  lat: 44.745,
  lng: -93.523,
};

const options = {
  disableDefaultUI: true,
  zoomControl: true,
  mapId: "74d818485994559a",
};

function MyComponent() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [map, setMap] = React.useState(null);

  const onLoad = React.useCallback(function callback(mapInstance: any) {
    // This is just an example of getting and using the map instance!!! don't just blindly copy!
    // const bounds = new window.google.maps.LatLngBounds(center);
    // map.fitBounds(bounds);
    const kmlLayer = new google.maps.KmlLayer({
      url: "https://www.google.com/maps/d/u/0/kml?mid=1FKYPSCOodzmWDszKJYHUrSL0jKpeVMc&lid=i9NuWw-UIno",
      map: mapInstance,
      preserveViewport: true,
      suppressInfoWindows: true,
    });

    setMap(mapInstance);
  }, []);

  const onUnmount = React.useCallback(function callback() {
    setMap(null);
  }, []);

  return isLoaded ? (
    <div className="flex flex-col h-dvh">
      <div className="controls hidden">
        <h1>Controls</h1>
      </div>
      <div className="map">
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
          {/* Child components, such as markers, info windows, etc. */}
          <></>
        </GoogleMap>
      </div>
    </div>
  ) : (
    <>Testing Loading Message</>
  );
}

export default React.memo(MyComponent);
