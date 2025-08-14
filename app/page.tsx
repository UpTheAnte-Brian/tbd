"use client";
// import DebugJWT from "@/app/ui/districts/debug-jwt";
// import { TokenSync } from "./auth/components/TokenSync";
import { LoadScript, Libraries } from "@react-google-maps/api";
import MapComponent from "./map/components/map";
const googleApiLibraries = process.env.NEXT_PUBLIC_GOOGLE_LIBRARIES;
const googleApiLibrariesArray = (
  googleApiLibraries ? googleApiLibraries.split(",") : []
) as Libraries;

export default function Page() {
  return (
    <LoadScript
      version="beta"
      libraries={googleApiLibrariesArray}
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
    >
      <MapComponent />
    </LoadScript>
  );
}
