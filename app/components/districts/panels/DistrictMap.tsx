"use client";

import type { DistrictDetails, Profile } from "@/app/lib/types/types";

export default function DistrictMap({
  district,
}: {
  district: DistrictDetails;
  user: Profile | null;
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white/60 p-4 text-sm text-gray-700">
      Map view is being migrated to the new map explorer.
      <div className="font-semibold text-gray-900 mt-1">
        {district.shortname ?? "District"}
      </div>
    </div>
  );
}
