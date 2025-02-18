import MapComponent from "@/app/ui/maps/map3";

export default function MapPage() {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return <MapComponent />;
}
