"use client";

import type { TabKey } from "@/app/components/entities/hooks/useEntityTabParam";
import type { EntityType } from "@/domain/entities/types";

type Props = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  entityType?: EntityType | null;
  tabsClassName?: string;
  tabsVariant?: "buttons" | "select";
  allowedTabs?: TabKey[];
};

const BASE_TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "branding", label: "Branding" },
  { key: "users", label: "Users" },
  { key: "map", label: "Map" },
];

const GOVERNANCE_TAB: { key: TabKey; label: string } = {
  key: "governance",
  label: "Governance",
};

const SUPERINTENDENT_TAB: { key: TabKey; label: string } = {
  key: "superintendent",
  label: "Superintendent",
};

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  superintendent: "Superintendent",
  branding: "Branding",
  users: "Users",
  map: "Map",
  governance: "Governance",
};

function getTabs(entityType?: EntityType | null) {
  if (entityType === "district") {
    return [
      BASE_TABS[0],
      SUPERINTENDENT_TAB,
      ...BASE_TABS.slice(1),
    ];
  }
  if (entityType !== "nonprofit") {
    return BASE_TABS;
  }
  return [
    ...BASE_TABS.slice(0, 3),
    GOVERNANCE_TAB,
    ...BASE_TABS.slice(3),
  ];
}

export default function EntityPanelTabs({
  activeTab,
  onTabChange,
  entityType,
  tabsClassName,
  tabsVariant = "buttons",
  allowedTabs,
}: Props) {
  const tabs = allowedTabs?.length
    ? allowedTabs.map((key) => ({ key, label: TAB_LABELS[key] }))
    : getTabs(entityType);
  if (tabsVariant === "select") {
    return (
      <div className={tabsClassName ?? ""}>
        <select
          className="mt-1 w-full rounded border border-brand-secondary-1 bg-brand-secondary-2 px-3 py-2 text-sm text-brand-secondary-0"
          value={activeTab}
          onChange={(event) => onTabChange(event.target.value as TabKey)}
        >
          {tabs.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap gap-2 border-b border-brand-secondary-1 pb-2 ${
        tabsClassName ?? ""
      }`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`rounded px-3 py-1 text-sm transition ${
            activeTab === tab.key
              ? "bg-brand-primary-0 text-brand-secondary-2"
              : "bg-transparent text-brand-secondary-0 hover:bg-brand-secondary-1"
          }`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
