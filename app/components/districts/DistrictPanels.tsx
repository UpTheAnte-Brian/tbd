"use client";
import DistrictMap from "@/app/components/districts/panels/DistrictMap";
import DistrictFoundation from "@/app/components/districts/panels/foundation";
import DistrictOverview from "@/app/components/districts/panels/overview";
import { DistrictWithFoundation, Profile } from "@/app/lib/types";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function DistrictPanels({
  user,
  district,
  reloadFoundation,
}: {
  user: Profile | null;
  district: DistrictWithFoundation;
  reloadFoundation: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab") || "Overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Keep internal state in sync with URL changes (e.g. back/forward)
  useEffect(() => {
    const current = searchParams.get("tab") || "Overview";
    setActiveTab(current);
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
    setActiveTab(tab);
  };

  const tabs = [
    "Overview",
    "Map",
    "Foundation",
    "Other Charities",
    "Businesses",
    "Admin",
    "Calendar",
  ];

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
            onClick={() => handleTabChange(tab)} // ✅ use the URL-sync handler
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-4 bg-white border border-t-0 border-gray-300">
        {activeTab === "Map" ? (
          <DistrictMap district={district} user={user} />
        ) : activeTab === "Overview" ? (
          <DistrictOverview district={district} />
        ) : activeTab === "Foundation" ? (
          <DistrictFoundation
            user={user}
            reloadFoundation={reloadFoundation}
            district={district}
          />
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
