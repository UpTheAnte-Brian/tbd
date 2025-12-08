import Link from "next/link";
import DistrictDonationsSummary from "@/app/components/districts/DistrictDonationsSummary";
import DistrictSideBar from "@/app/components/ui/district-sidebar";
import { DistrictWithFoundation } from "@/app/lib/types/types";

export default function DistrictOverview({
  district,
}: // user,
{
  district: DistrictWithFoundation;
  // user: Profile | null;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full">
      {/* Left / Main content */}
      <div className="md:w-3/4 mb-4 md:mb-0 bg-district-primary-0 text-district-primary-1 p-4 rounded-lg shadow-sm md:shadow-none md:bg-transparent md:p-0">
        <div className="[&>*]:text-black space-y-2">
          <p>Main content goes here</p>
          <p>Ideas:</p>
          <ul className="list-disc list-inside space-y-1 [&>*]:text-black">
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
            <li className="text-black">Graduation rate percentage</li>
            <li className="text-black">Average SAT/ACT scores</li>
            <li className="text-black">Number of AP courses offered</li>
            <li className="text-black">State test proficiency ratings</li>
          </ul>

          <p>
            Establish donation goals with a visual indicator (e.g., coins
            filling a vase).
          </p>
        </div>
      </div>

      {/* Sidebar / Donate summary */}
      <div className="md:w-1/4 mb-4 md:mb-0 bg-white p-4 rounded-lg shadow-sm md:shadow-none md:bg-transparent md:p-0">
        <div className="md:sticky md:top-4 self-start">
          <div className="flex flex-col gap-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <Link
              href={`/donate/${district.id}`}
              className="w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
