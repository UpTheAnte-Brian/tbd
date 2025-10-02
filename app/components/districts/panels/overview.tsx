import Link from "next/link";
import DistrictDonationsSummary from "@/app/components/districts/DistrictDonationsSummary";
import DistrictSideBar from "@/app/components/ui/district-sidebar";
import { DistrictWithFoundation } from "@/app/lib/types";

export default function DistrictOverview({
  district,
}: // user,
{
  district: DistrictWithFoundation;
  // user: Profile | null;
}) {
  return (
    <div>
      {/* Flex container for two-column layout */}
      <div className="flex gap-4 w-full">
        {/* Left content: 3/4 width */}
        <div className="w-3/4 [&>*]:text-black">
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
          <ul className="list-disc list-inside space-y-1 [&>*]:text-black">
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
          <Link
            href={`/donate/${district.id}`}
            className="inline-block px-4 py-2 bg-blue-600 text-white justify-center text-center rounded hover:bg-blue-700 hover:underline hover:decoration-blue-700"
          >
            Donate
          </Link>
          <DistrictSideBar district={district} />
          <DistrictDonationsSummary districtId={district.id} />
        </div>
      </div>
    </div>
  );
}
