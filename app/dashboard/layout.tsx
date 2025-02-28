"use client";
import SideNav from "@/app/ui/dashboard/sidenav";
import useGoogleMaps from "../lib/map-context";
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isLoaded, loadError } = useGoogleMaps(GOOGLE_MAPS_API_KEY);

  if (loadError) return "Error loading maps";
  if (!isLoaded) return "Loading Maps";
  return (
    <div className="flex  flex-col md:flex-row md:overflow-hidden">
      <div className="w-full items-end justify-start rounded-md bg-blue-600 p-4 md:w-64">
        <SideNav />
      </div>
      <div className="flex-grow md:overflow-y-auto px-3 py-4 md:px-2">
        {children}
      </div>
    </div>
  );
}
