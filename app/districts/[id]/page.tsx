"use client";
import { useDistrict } from "@/app/hooks/useDistrict";
import { useFoundation } from "@/app/hooks/useFoundation";
import LoadingSpinner from "@/app/components/loading-spinner";
import { useParams } from "next/navigation";
import DistrictPanels from "@/app/components/districts/DistrictPanels";
import DistrictPanelsSidebar from "@/app/components/districts/DistrictPanelsSidebar";
import { useUser } from "@/app/hooks/useUser";

export default function DistrictPage() {
  const params = useParams();
  const { id } = params;
  const { user, loading: userLoading, error: userError } = useUser();

  const {
    district,
    loading: districtLoading,
    error: districtError,
    reload: reloadDistrict,
  } = useDistrict(id as string);

  // Lazy load foundation once district is available
  const sdorgid = district?.sdorgid;
  const {
    foundation,
    loading: foundationLoading,
    error: foundationError,
    reload,
  } = useFoundation(sdorgid);

  if (userError) {
    console.warn("No user session");
  }

  if (districtLoading) return <LoadingSpinner />;
  if (!district || districtError) return <p>No district found</p>;

  if (foundationError) {
    console.warn("Foundation error:", foundationError);
  }

  // Unified loading state
  const isLoading = userLoading || foundationLoading;

  return (
    <main className="p-4 bg-district-primary-0">
      {/* <DistrictPrimaryLogo
        districtId={district.id}
        districtName={district.shortname}
        subtitle="Primary logo"
      /> */}

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Desktop/medium+: sidebar layout with logo */}
          <div className="hidden md:block">
            <DistrictPanelsSidebar
              district={{ ...district, foundation }}
              user={user}
              reloadFoundation={reload}
              reloadDistrict={reloadDistrict}
            />
          </div>
          {/* Mobile: keep existing top tabs */}
          <div className="md:hidden">
            <DistrictPanels
              district={{ ...district, foundation }}
              user={user}
              reloadFoundation={reload}
              reloadDistrict={reloadDistrict}
            />
          </div>
        </>
      )}
    </main>
  );
}
