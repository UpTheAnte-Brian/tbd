import Breadcrumbs from "@/app/ui/invoices/breadcrumbs";
import { getDistrictDTO } from "@/app/data/districts-dto";
import { DistrictWithFoundation } from "@/app/lib/types";

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
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3">
        <div className="text-lg font-semibold text-gray-500 text-center">
          {district.shortname}
        </div>
      </div>
    </main>
  );
}
