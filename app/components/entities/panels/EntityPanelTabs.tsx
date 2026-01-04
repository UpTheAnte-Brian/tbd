"use client";

import type { TabKey } from "@/app/components/entities/hooks/useEntityTabParam";

type Props = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
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
  activeTab,
  onTabChange,
  tabsClassName,
  tabsVariant = "buttons",
}: Props) {
  if (tabsVariant === "select") {
    return (
      <div className={tabsClassName ?? ""}>
        <select
          className="mt-1 w-full rounded border border-brand-secondary-1 bg-brand-secondary-2 px-3 py-2 text-sm text-brand-secondary-0"
          value={activeTab}
          onChange={(event) => onTabChange(event.target.value as TabKey)}
        >
          {TAB_ORDER.map((tab) => (
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
      {TAB_ORDER.map((tab) => (
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
