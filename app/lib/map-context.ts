"use client";

import { useState, useEffect } from "react";
import { useLoadScript } from "@react-google-maps/api";

let scriptLoaded = false;

function useGoogleMaps(googleMapsApiKey: string) {
  const [isLoaded, setIsLoaded] = useState(scriptLoaded);
  const { isLoaded: scriptIsLoaded, loadError } = useLoadScript({
    googleMapsApiKey: googleMapsApiKey,
    preventGoogleFontsLoading: true,
    libraries: ["places"],
  });

  useEffect(() => {
    if (!scriptLoaded && !loadError && scriptIsLoaded) {
      setIsLoaded(true);
      scriptLoaded = true;
    } else if (loadError) {
      setIsLoaded(false);
      scriptLoaded = false;
    }
  }, [googleMapsApiKey, loadError, scriptIsLoaded]);

  return { isLoaded, loadError };
}

export default useGoogleMaps;
