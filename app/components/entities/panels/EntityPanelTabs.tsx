"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { EntityType } from "@/app/lib/types/types";
import EntityOverviewTab from "@/app/components/entities/tabs/overview/EntityOverviewTab";
import EntityBrandingTab from "@/app/components/entities/tabs/branding/EntityBrandingTab";
import EntityUsersTab from "@/app/components/entities/tabs/users/EntityUsersTab";
import EntityMapTab from "@/app/components/entities/tabs/map/EntityMapTab";

type TabKey = "overview" | "branding" | "users" | "map";

type Props = {
  entityId: string;
  entityType: EntityType | null;
  entityName?: string;
};

const TAB_ORDER: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "branding", label: "Branding" },
  { key: "users", label: "Users" },
  { key: "map", label: "Map" },
];

export default function EntityPanelTabs({
  entityId,
  entityType,
  entityName,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const normalizeTab = (value: string | null): TabKey => {
    const lower = (value ?? "overview").toLowerCase();
    if (lower === "branding") return "branding";
    if (lower === "users") return "users";
    if (lower === "map") return "map";
    return "overview";
  };

  const initialTab = normalizeTab(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    const current = normalizeTab(searchParams.get("tab"));
    setActiveTab(current);
  }, [searchParams]);

  const handleTabChange = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
    setActiveTab(tab);
  };

  const tabContent = useMemo(() => {
    if (!entityType) {
      return (
        <div className="rounded border border-dashed p-4 text-sm text-gray-500">
          Entity type not available.
        </div>
      );
    }

    switch (activeTab) {
      case "overview":
        return (
          <EntityOverviewTab
            entityId={entityId}
            entityType={entityType}
            entityName={entityName ?? "Entity"}
          />
        );
      case "branding":
        return (
          <EntityBrandingTab
            entityId={entityId}
            entityType={entityType}
            entityName={entityName ?? "Entity"}
          />
        );
      case "users":
        return <EntityUsersTab entityId={entityId} />;
      case "map":
        return <EntityMapTab entityId={entityId} entityType={entityType} />;
      default:
        return null;
    }
  }, [activeTab, entityId, entityName, entityType]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-gray-300 pb-2">
        {TAB_ORDER.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`px-3 py-1 text-sm rounded ${
              activeTab === tab.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">{tabContent}</div>
    </div>
  );
}
