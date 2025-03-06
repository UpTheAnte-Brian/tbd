"use client";
import SignIn from "./ui/sign-in";
import MapComponent from "./ui/maps/map3";
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// const libraries = String(["places", "geometry"]);
// MapComponent.js
import useGoogleMaps from "./lib/map-context";

export default function Page() {
  const { isLoaded, loadError } = useGoogleMaps(GOOGLE_MAPS_API_KEY);

  if (loadError) return "Error loading maps";
  if (!isLoaded) return "Loading Maps";
  return (
    <>
      <div className="flex grow flex-col gap-4 md:flex-row rounded-lg outline">
        <div className="flex flex-col justify-center gap-6 px-6 py-10 md:w-2/5 md:px-20 rounded-lg outline">
          <p className={`text-xl text-gray-800 md:text-3xl md:leading-normal`}>
            <strong>Site in Development</strong> <br />
            This is a prototype.
            {/* <a href="https://uptheante.org/" className="text-blue-500">
              UpTheAnte.org
            </a>
            , brought to you by Ante Up Nation. */}
          </p>
          {/* <Link
            href="/login"
            className="flex items-center gap-5 self-start rounded-lg bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-400 md:text-base"
          >
            <span>Log in</span> <ArrowRightIcon className="w-5 md:w-6" />
          </Link> */}
          <SignIn />
        </div>
        <div className="flex items-center justify-center p-1 md:w-3/5 md:p-3 rounded-lg outline">
          <MapComponent />
        </div>
      </div>
    </>
  );
}
