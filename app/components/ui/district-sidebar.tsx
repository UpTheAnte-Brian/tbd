"use client";

import React from "react";
import { DistrictDetails } from "../../lib/types/types";
import DistrictExtWebLinkHeader from "@/app/components/ui/district-ext-weblink-header";

const DistrictSideBar = React.memo(
  ({ district }: { district: DistrictDetails }) => {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3">
        {/* Shortname above logo, clickable if web_url exists */}
        <div className="flex flex-col items-center gap-2">
          {district.web_url ? (
            <DistrictExtWebLinkHeader
              name={district.shortname ?? ""}
              url={district.web_url}
            />
          ) : (
            <div className="text-lg font-semibold text-gray-500">
              {district.shortname}
            </div>
          )}
        </div>

        {/* Area */}
        <div className="text-center">
          <div className="text-sm text-gray-500">Area</div>
          <div className="text-lg font-semibold text-gray-500">
            {Number(district.sqmiles ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}{" "}
            sq mi
          </div>
        </div>

        {/* Enrollment */}
        <div className="text-center">
          <div className="text-sm text-gray-500">Enrollment</div>
          <div className="text-lg font-semibold text-gray-500">?</div>
        </div>
      </div>
    );
  }
);

export default DistrictSideBar;
