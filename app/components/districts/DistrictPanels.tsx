"use client";
import { Calendar } from "@/app/components/calendar/calendar";
import DistrictAdmin from "@/app/components/districts/panels/admin";
import { BrandingPanel } from "@/app/components/districts/panels/branding";
import DistrictMap from "@/app/components/districts/panels/DistrictMap";
import DistrictOverview from "@/app/components/districts/panels/overview";
import { DistrictFeature, EntityUser, Profile } from "@/app/lib/types/types";
import { hasEntityRole } from "@/app/lib/auth/entityRoles";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function DistrictPanels({
  user,
  district,
  reloadDistrict,
}: {
  user: Profile | null;
  district: DistrictFeature;
  reloadDistrict: () => void;
}) {
  const props = district.properties;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab") || "Overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  const entityUsers = (user?.entity_users ?? []) as EntityUser[];
  const platformAdmin = user?.global_role === "admin";
  const districtAdmin = hasEntityRole(entityUsers, "district", district.id, ["admin"]);

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
    "Branding",
    "Businesses",
    "Admin",
    "Calendar",
  ];
  const campaignDays = Array.from(
    { length: 30 },
    (_, i) => new Date(2025, 10, i + 1)
  );
  return (
    <div className="bg-district-accent-0 text-district-secondary-0 min-h-screen">
      {/* Desktop Tabs */}
      <div className="hidden md:flex border-b border-gray-300 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 -mb-px border-b-2 font-medium whitespace-nowrap ${
              activeTab === tab
                ? "border-blue-500 bg-white text-blue-600"
                : "border-transparent text-gray-300 hover:text-white hover:border-gray-300"
            }`}
            onClick={() => handleTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Mobile Dropdown */}
      <div className="md:hidden relative border-b border-gray-300">
        <select
          value={activeTab}
          onChange={(e) => handleTabChange(e.target.value)}
          className="w-full p-2 bg-white text-gray-800 border-none focus:ring-0 focus:outline-none"
        >
          {tabs.map((tab) => (
            <option className="text-black" key={tab} value={tab}>
              {tab}
            </option>
          ))}
        </select>
      </div>
      <div className="p-4 border border-t-0 border-gray-300">
        {activeTab === "Map" ? (
          <DistrictMap district={district} user={user} />
        ) : activeTab === "Overview" ? (
          <DistrictOverview district={district} />
        ) : activeTab === "Branding" ? (
          <BrandingPanel
            districtId={district.id}
            districtShortname={props?.shortname ?? ""}
          />
        ) : activeTab === "Admin" && user && (platformAdmin || districtAdmin) ? (
          <DistrictAdmin
            user={user}
            district={district}
            reloadDistrict={reloadDistrict}
          ></DistrictAdmin>
        ) : activeTab === "Calendar" && user ? (
          <Calendar
            month={10} // November
            year={2025}
            campaignDays={campaignDays}
            initialData={{ "2025-11-05": 50 }}
            onChange={(data) =>
              console.log("Updated transaction counts:", data)
            }
          />
        ) : activeTab === "Foundation" ? (
          <>
            <h2 className="text-xl font-semibold text-black">
              Foundation Panel
            </h2>
            <p className="text-black">
              This space is reserved for the upcoming nonprofit foundation
              experience.
            </p>
          </>
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
