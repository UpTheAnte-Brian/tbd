"use client";
import MapComponent from "./ui/maps/map3";
// const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// const libraries = String(["places", "geometry"]);
// MapComponent.js
// import useGoogleMaps from "./lib/map-context";

export default function Page() {
  // const { isLoaded, loadError } = useGoogleMaps(GOOGLE_MAPS_API_KEY);

  // if (loadError) return "Error loading maps";
  // if (!isLoaded) return "Loading Maps";
  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row">
        {/* <div className="flex flex-col justify-center gap-6 px-6 py-10 md:w-2/5 md:px-20 rounded-lg ">
          <p className={`text-xl text-gray-100 md:text-3xl md:leading-normal`}>
            <strong>Site in Development</strong> <br />
            This is a prototype.
          </p>
        </div> */}
        {/* <div className="flex items-center justify-center p-1 md:w-3/5 md:p-3 rounded-lg">
          <MapComponent />
        </div> */}
        <MapComponent />
      </div>
    </>
  );
}
