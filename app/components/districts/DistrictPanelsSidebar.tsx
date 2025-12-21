"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar } from "@/app/components/calendar/calendar";
import DistrictAdmin from "@/app/components/districts/panels/admin";
import { BrandingPanel } from "@/app/components/districts/panels/branding";
import DistrictMap from "@/app/components/districts/panels/DistrictMap";
import DistrictOverview from "@/app/components/districts/panels/overview";
import DistrictPrimaryLogo from "@/app/components/districts/branding/DistrictPrimaryLogo";
import DistrictPaletteCube from "@/app/components/branding/DistrictPaletteCube";
import { DistrictFeature, EntityUser, Profile } from "@/app/lib/types/types";
import { hasEntityRole } from "@/app/lib/auth/entityRoles";

type Props = {
  user: Profile | null;
  district: DistrictFeature;
  reloadDistrict: () => void;
};

export default function DistrictPanelsSidebar({
  user,
  district,
  reloadDistrict,
}: Props) {
  const props = district.properties;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const entityUsers = (user?.entity_users ?? []) as EntityUser[];
  const platformAdmin = user?.global_role === "admin";
  const districtAdmin = hasEntityRole(entityUsers, "district", district.id, ["admin"]);

  useEffect(() => {
    setHydrated(true);
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

  // Avoid rendering mismatched markup before hydration resolves the tab value.
  if (!hydrated) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <aside className="w-48 rounded-lg bg-district-primary-0 text-district-secondary-0 border border-district-primary-1/30 p-2 shadow-sm flex flex-col gap-3 md:sticky md:top-24 self-start">
        <DistrictPrimaryLogo
          entityId={district.id}
          entityType="district"
          districtName={props?.shortname ?? ""}
        />
        <div className="mt-4 space-y-2 hidden md:block">
          {tabs.map((tab) => {
            const active = hydrated && activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`w-full text-left px-3 py-2 rounded border transition text-sm ${
                  active
                    ? "bg-district-accent-0 text-white border-district-accent-0 shadow-sm"
                    : "bg-district-primary-0 text-district-primary-1 border-district-primary-0 hover:bg-district-primary-0/80"
                }`}
              >
                {tab}
              </button>
            );
          })}
          <div className="mt-6">
            <DistrictPaletteCube />
          </div>
        </div>
        {/* Mobile dropdown */}
        <div className="md:hidden mt-3">
          <select
            value={activeTab ?? "Overview"}
            onChange={(e) => handleTabChange(e.target.value)}
            className="w-full p-2 bg-white text-gray-800 border border-district-primary-1/40 rounded focus:outline-none"
          >
            {tabs.map((tab) => (
              <option key={tab} value={tab}>
                {tab}
              </option>
            ))}
          </select>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
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
          />
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
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-black">
              Foundation Panel
            </h2>
            <p className="text-black">
              Nonprofit foundation content will live here once it is rebuilt.
            </p>
          </div>
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
