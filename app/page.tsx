// import DebugJWT from "@/app/ui/districts/debug-jwt";
// import { TokenSync } from "./auth/components/TokenSync";
import MapComponent from "./map/components/map";

export default function Page() {
  return (
    <>
      {/* <TokenSync />
      <DebugJWT /> */}
      <div className="flex flex-col gap-4 md:flex-row">
        <MapComponent />
      </div>
    </>
  );
}
