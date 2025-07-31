"use client";
// import { useMemo } from "react";
import MapComponent from "./components/map";

// type LatLngLiteral = google.maps.LatLngLiteral;
// const center = useMemo<LatLngLiteral>(() => ({ lat: 46.3, lng: -94.2 }), []);
// const zoom = 6;

export default function Page() {
  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row">
        <MapComponent />
      </div>
    </>
  );
}
