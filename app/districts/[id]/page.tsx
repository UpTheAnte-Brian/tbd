import Breadcrumbs from "@/app/ui/invoices/breadcrumbs";
import { getDistrictDTO } from "@/app/data/districts-dto";
import { DistrictWithFoundation } from "@/app/lib/types";
import DistrictSideBar from "@/app/components/ui/district-sidebar";
import { OneTimeDonateButton } from "@/app/components/stripe/DonationButton";
import { MonthlyDonateButton } from "@/app/components/stripe/RecurringDonationButton";

export default async function DistrictPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const district: DistrictWithFoundation = await getDistrictDTO(id);

  if (!district) return <p>No district found</p>;

  return (
    <main className="p-4">
      <Breadcrumbs
        breadcrumbs={[
          { label: "Districts", href: "/districts" },
          {
            label: id,
            href: `/districts/${id}`,
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
        </div>

        <OneTimeDonateButton></OneTimeDonateButton>
        <MonthlyDonateButton></MonthlyDonateButton>

        {/* Right sidebar: 1/4 width, sticky */}
        <div className="w-1/4 sticky top-4 self-start">
          <DistrictSideBar district={district} />
        </div>
      </div>
    </main>
  );
}
