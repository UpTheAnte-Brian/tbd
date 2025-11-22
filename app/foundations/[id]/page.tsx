"use client";
import Breadcrumbs from "@/app/components/nav/breadcrumbs";
import { useDistrict } from "@/app/hooks/useDistrict";
import { useFoundation } from "@/app/hooks/useFoundation";
import LoadingSpinner from "@/app/components/loading-spinner";
import { useParams } from "next/navigation";
import DistrictPanels from "@/app/components/districts/DistrictPanels";
import { useUser } from "@/app/hooks/useUser";

export default function FoundationPage() {
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
    <main className="p-4">
      <Breadcrumbs
        breadcrumbs={[
          { label: "Districts", href: "/districts" },
          {
            label: district.sdorgid,
            href: `/districts/${district.sdorgid}`,
            active: true,
          },
        ]}
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div>
          <DistrictPanels
            district={{ ...district, foundation }}
            user={user} // can be null if logged out
            reloadFoundation={reload}
            reloadDistrict={reloadDistrict}
          />
        </div>
      )}
    </main>
  );
}
