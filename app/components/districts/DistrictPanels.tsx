"use client";
import DistrictMap from "@/app/components/districts/panels/DistrictMap";
import DistrictOverview from "@/app/components/districts/panels/overview";
import { DistrictWithFoundation } from "@/app/lib/types";
import React, { useState } from "react";

export default function DistrictPanels({
  // user,
  district,
}: {
  // user: Profile | null;
  district: DistrictWithFoundation;
}) {
  const tabs = [
    "Overview",
    "Map",
    "Foundation",
    "Other Charities",
    "Admin",
    "Calendar",
  ];
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <div>
      <div className="flex border-b border-gray-300">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 -mb-px border-b-2 font-medium ${
              activeTab === tab
                ? "border-blue-500 bg-white text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-4 bg-white border border-t-0 border-gray-300">
        {activeTab === "Map" ? (
          <DistrictMap district={district} />
        ) : activeTab === "Overview" ? (
          <DistrictOverview district={district} />
        ) : (
          <>
            <h2 className="text-xl font-semibold text-black">
              {activeTab} Panel
            </h2>
            <p className="text-black">
              This is the placeholder content for the {activeTab} tab.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
