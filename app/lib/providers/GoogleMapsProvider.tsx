// app/providers/GoogleMapsProvider.tsx
"use client";

import { LoadScriptNext, Libraries } from "@react-google-maps/api";

const googleApiLibraries = process.env.NEXT_PUBLIC_GOOGLE_LIBRARIES;
const googleApiLibrariesArray = (
  googleApiLibraries ? googleApiLibraries.split(",") : []
) as Libraries;

export default function GoogleMapsProvider({
  children,
}: {
  children: React.ReactElement;
}) {
  return (
    <LoadScriptNext
      version="beta"
      libraries={googleApiLibrariesArray}
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
    >
      {children}
    </LoadScriptNext>
  );
}
