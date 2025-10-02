"use client";
import Breadcrumbs from "@/app/ui/invoices/breadcrumbs";
import { useDistrict } from "@/app/hooks/useDistrict";
import LoadingSpinner from "@/app/components/loading-spinner";
import { useParams } from "next/navigation";
import DistrictPanels from "@/app/components/districts/DistrictPanels";

export default function DistrictPage() {
  const params = useParams();
  const { id } = params;
  // const { user, loading, error: userError } = useUser();

  const {
    district,
    loading: districtLoading,
    error: districtError,
  } = useDistrict(id as string);

  // if (userError) {
  //   console.warn("no user session");
  // }
  if (districtLoading) return <LoadingSpinner />;
  if (!district || districtError) return <p>No district found</p>;

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
      <DistrictPanels district={district}></DistrictPanels>
    </main>
  );
}
