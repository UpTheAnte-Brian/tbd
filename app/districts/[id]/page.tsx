"use client";
import Breadcrumbs from "@/app/ui/invoices/breadcrumbs";
import { useDistrict } from "@/app/hooks/useDistrict";
import { useFoundation } from "@/app/hooks/useFoundation";
import LoadingSpinner from "@/app/components/loading-spinner";
import { useParams } from "next/navigation";
import DistrictPanels from "@/app/components/districts/DistrictPanels";
import { useUser } from "@/app/hooks/useUser";

export default function DistrictPage() {
  const params = useParams();
  const { id } = params;
  const { user, error: userError } = useUser();

  const {
    district,
    loading: districtLoading,
    error: districtError,
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
    console.warn("no user session");
  }

  if (districtLoading) return <LoadingSpinner />;
  if (!district || districtError) return <p>No district found</p>;

  // Optionally show if foundation failed to load, but district did
  if (foundationError) {
    console.warn("Foundation error:", foundationError);
  }

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
      {user && !foundationLoading && (
        <div>
          <p className="text-black">Test Name: {foundation?.name}</p>
          <DistrictPanels
            district={{ ...district, foundation }}
            user={user}
            reloadFoundation={reload}
          />
        </div>
      )}

      {foundationLoading && (
        <p className="text-sm text-gray-500 mt-2">Loading foundation data...</p>
      )}
    </main>
  );
}
