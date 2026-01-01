// app/providers/GoogleMapsProvider.tsx
"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { LoadScriptNext, Libraries } from "@react-google-maps/api";

const googleApiLibraries = process.env.NEXT_PUBLIC_GOOGLE_LIBRARIES;
const googleApiLibrariesArray = (
  googleApiLibraries ? googleApiLibraries.split(",") : []
) as Libraries;

type GoogleMapsStatus = {
  isLoaded: boolean;
  loadError: string | null;
};

const GoogleMapsStatusContext = createContext<GoogleMapsStatus | null>(null);

export function useGoogleMapsStatus(): GoogleMapsStatus {
  return (
    useContext(GoogleMapsStatusContext) ?? {
      isLoaded: false,
      loadError: null,
    }
  );
}

export default function GoogleMapsProvider({
  children,
}: {
  children: React.ReactElement;
}) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [status, setStatus] = useState<GoogleMapsStatus>({
    isLoaded: false,
    loadError: googleMapsApiKey
      ? null
      : "Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
  });
  const didLoadRef = useRef(false);
  const didErrorRef = useRef(false);
  const contextValue = useMemo(() => status, [status]);

  if (!googleMapsApiKey) {
    return (
      <GoogleMapsStatusContext.Provider value={contextValue}>
        {children}
      </GoogleMapsStatusContext.Provider>
    );
  }

  return (
    <GoogleMapsStatusContext.Provider value={contextValue}>
      <LoadScriptNext
        version="beta"
        libraries={googleApiLibrariesArray}
        googleMapsApiKey={googleMapsApiKey}
        onLoad={() => {
          if (didLoadRef.current) return;
          didLoadRef.current = true;
          setStatus((prev) =>
            prev.isLoaded && !prev.loadError
              ? prev
              : { isLoaded: true, loadError: null }
          );
        }}
        onError={() => {
          if (didErrorRef.current) return;
          didErrorRef.current = true;
          setStatus((prev) =>
            prev.loadError
              ? prev
              : {
                  isLoaded: false,
                  loadError: "Failed to load Google Maps script.",
                }
          );
        }}
      >
        {children}
      </LoadScriptNext>
    </GoogleMapsStatusContext.Provider>
  );
}
