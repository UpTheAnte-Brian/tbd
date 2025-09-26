"use client";
import Breadcrumbs from "@/app/ui/invoices/breadcrumbs";
import DistrictSideBar from "@/app/components/ui/district-sidebar";
import { MonthlyDonateButton } from "@/app/components/stripe/RecurringDonationButton";
import DistrictDonationsSummary from "@/app/components/districts/DistrictDonationsSummary";
import { DistrictDonateButton } from "@/app/components/stripe/DistrictDonationButton";
import DistrictMap from "@/app/components/districts/DistrictMap";
import DistrictSvgMap from "@/app/components/districts/DistrictFloatingSvg";
import { useUser } from "@/app/hooks/useUser";
import React from "react";
import { useDistrict } from "@/app/hooks/useDistrict";
import LoadingSpinner from "@/app/components/loading-spinner";
import { useParams } from "next/navigation";

export default function DistrictPage() {
  const params = useParams();
  const { id } = params;
  const { user, loading, error: userError } = useUser();
  console.log("districtId: ", id);
  const {
    district,
    loading: districtLoading,
    error: districtError,
  } = useDistrict(id as string);

  if (userError) {
    console.warn("no user session");
  }
  const anonymousDonor = !user;
  if (loading || districtLoading) return <LoadingSpinner />;
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

      {/* Flex container for two-column layout */}
      <div className="flex gap-4 w-full">
        {/* Left content: 3/4 width */}
        <div className="w-3/4">
          <p>Main content goes here</p>
          {/* Replace this with your actual district details */}
          <p>Ideas:</p>
          <p>-Foundation and other local charities</p>
          <p>
            -Calendar of Events - Ante Up Nation could layer in campaign related
            events and dates.
          </p>
          <p>
            -It would be interesting to experiment with an opaque map background
            from the districts geojson. Could include district facilities from
            another state-provided KML Layer.{" "}
          </p>
          <p>-On Hover Hook to show magnifying glass that zooms. </p>
          <h3 className="text-lg font-semibold mb-2">Academic Data:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Graduation rate percentage</li>
            <li>Average SAT/ACT scores</li>
            <li>Number of AP courses offered</li>
            <li>State test proficiency ratings</li>
          </ul>
          <p>
            -Establish donation goals and have a visual indicator of the status.
            e.g. Coins filling a vase.{" "}
          </p>
        </div>

        {/* Right sidebar: 1/4 width, sticky */}
        <div className="w-1/4 sticky top-4 self-start">
          <DistrictSideBar district={district} />
          <DistrictDonateButton
            districtId={district.id}
            anonymous={anonymousDonor}
          ></DistrictDonateButton>
          <MonthlyDonateButton districtId={district.id}></MonthlyDonateButton>
          <DistrictDonationsSummary districtId={district.id} />
        </div>
      </div>

      {district && (
        <>
          <DistrictMap d={district} />
          <DistrictSvgMap d={district} />
        </>
      )}
    </main>
  );
}
