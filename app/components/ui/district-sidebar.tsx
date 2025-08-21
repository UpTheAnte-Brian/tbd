import React from "react";
import { DistrictWithFoundation } from "../../lib/types";

const DistrictSideBar = React.memo(
  ({ district }: { district: DistrictWithFoundation }) => {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3">
        {/* Shortname above logo, centered */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-lg font-semibold text-gray-500 text-center">
            {district.shortname}
          </div>

          {district.metadata?.logo_path && (
            <img
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/${process.env.NEXT_PUBLIC_SUPABASE_STORAGE_LOGO_PATH}${district.metadata.logo_path}`}
              alt="Logo"
              className="h-10 object-contain"
            />
          )}
        </div>

        {/* Area */}
        <div className="text-center">
          <div className="text-sm text-gray-500">Area</div>
          <div className="text-lg font-semibold text-gray-500">
            {Number(district.properties.sqmiles).toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}{" "}
            sq mi
          </div>
        </div>

        {/* Website */}
        <div className="text-center">
          <div className="text-sm text-gray-500">Website</div>
          <div className="text-lg font-semibold text-gray-500">
            {district.properties.web_url}
          </div>
        </div>
      </div>
    );
  }
);
export default DistrictSideBar;
