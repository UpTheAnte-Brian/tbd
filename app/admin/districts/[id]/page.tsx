import Breadcrumbs from "@/app/ui/invoices/breadcrumbs";
import { getDistrictDTO } from "@/app/data/districts-dto";
import { DistrictWithFoundation } from "@/app/lib/types";
import DistrictSideBar from "@/app/components/ui/district-sidebar";

export default async function DistrictPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const district: DistrictWithFoundation = await getDistrictDTO(id);

  if (!district) return <p>No district found</p>;

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: "Districts", href: "/admin/districts" },
          {
            label: id,
            href: `/admin/districts/${id}`,
            active: true,
          },
        ]}
      />

      {/* Flex container for two-column layout */}
      <div className="flex gap-4 w-full p-4">
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
            from the districts geojson.{" "}
          </p>
          <p>-On Hover Hook to show magnifying glass that zooms. </p>
        </div>

        {/* Right sidebar: 1/4 width, sticky */}
        <div className="w-1/4 sticky top-4 self-start">
          <DistrictSideBar district={district} />
        </div>
      </div>
    </main>
  );
}
