"use client";

import { useMemo } from "react";
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
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  showTabs?: boolean;
  tabsClassName?: string;
  tabsVariant?: "buttons" | "select";
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
  activeTab,
  onTabChange,
  showTabs = true,
  tabsClassName,
  tabsVariant = "buttons",
}: Props) {
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
      {showTabs ? (
        tabsVariant === "select" ? (
          <div className={tabsClassName ?? ""}>
            <label className="block text-xs font-semibold text-gray-600">
              Panel
            </label>
            <select
              className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              value={activeTab}
              onChange={(event) =>
                onTabChange(event.target.value as TabKey)
              }
            >
              {TAB_ORDER.map((tab) => (
                <option key={tab.key} value={tab.key}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div
            className={`flex flex-wrap gap-2 border-b border-gray-300 pb-2 ${tabsClassName ?? ""}`}
          >
            {TAB_ORDER.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`px-3 py-1 text-sm rounded ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                onClick={() => onTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )
      ) : null}

      <div className="mt-4">{tabContent}</div>
    </div>
  );
}
