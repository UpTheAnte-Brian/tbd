"use client";

import Link from "next/link";
import DistrictDonationsSummary from "@/app/components/districts/DistrictDonationsSummary";
import LeadershipSection from "@/app/components/districts/LeadershipSection";
import DistrictSideBar from "@/app/components/ui/district-sidebar";
import { DistrictDetails } from "@/app/lib/types/types";

export default function DistrictOverview({
  district,
}: // user,
{
  district: DistrictDetails;
  // user: Profile | null;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full">
      {/* Left / Main content */}
      <div className="md:w-3/4 mb-4 md:mb-0 rounded-lg border border-brand-secondary-1 bg-brand-secondary-2 p-4 md:border-0 md:bg-transparent text-brand-secondary-0 space-y-6">
        <LeadershipSection entityId={district.entity_id ?? district.id} />
        <div className="space-y-2">
          <p>Main content goes here</p>
          <p>Ideas:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Foundation and other local charities</li>
            <li>
              Calendar of Events – Ante Up Nation could layer in
              campaign-related events and dates.
            </li>
            <li>
              Experiment with an opaque map background from the district’s
              GeoJSON. Could include facilities from a state-provided KML layer.
            </li>
            <li>Hover hook to show magnifying glass zoom.</li>
          </ul>

          <h3 className="text-lg font-semibold mt-4">Academic Data</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Graduation rate percentage</li>
            <li>Average SAT/ACT scores</li>
            <li>Number of AP courses offered</li>
            <li>State test proficiency ratings</li>
          </ul>

          <p>
            Establish donation goals with a visual indicator (e.g., coins
            filling a vase).
          </p>
        </div>
      </div>

      {/* Sidebar / Donate summary */}
      <div className="md:w-1/4 mb-4 md:mb-0 rounded-lg border border-brand-secondary-1 bg-brand-secondary-2 p-4 md:border-0 md:bg-transparent md:p-0 text-brand-secondary-0">
        <div className="md:sticky md:top-4 self-start">
          <div className="flex flex-col gap-3 rounded-md border border-brand-secondary-1 bg-brand-secondary-2 p-3">
            <Link
              href={`/donate/${district.id}`}
              className="w-full rounded-md bg-brand-primary-0 px-4 py-2 text-center text-brand-secondary-2 hover:bg-brand-primary-2"
            >
              Donate
            </Link>

            <DistrictSideBar district={district} />
            <DistrictDonationsSummary districtId={district.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
