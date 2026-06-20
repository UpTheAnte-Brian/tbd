"use client";

import {
  getEntityTabLabel,
  getVisibleEntityTabKeys,
  type EntityTabContext,
  type EntityTabKey,
} from "@/app/components/entities/entityTabs";

type Props = {
  activeTab: EntityTabKey;
  onTabChange: (tab: EntityTabKey) => void;
  tabsClassName?: string;
  tabsVariant?: "buttons" | "select";
  allowedTabs?: EntityTabKey[];
  tabContext: EntityTabContext;
};

export default function EntityPanelTabs({
  activeTab,
  onTabChange,
  tabsClassName,
  tabsVariant = "buttons",
  allowedTabs,
  tabContext,
}: Props) {
  const resolvedTabs =
    allowedTabs && allowedTabs.length > 0
      ? allowedTabs
      : getVisibleEntityTabKeys(tabContext);
  const tabs = resolvedTabs.map((key) => ({
    key,
    label: getEntityTabLabel(key, tabContext),
  }));
  if (tabsVariant === "select") {
    return (
      <div className={tabsClassName ?? ""}>
        <select
          className="mt-1 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm font-medium text-[#0f172a] shadow-sm focus:border-[#2563eb] focus:outline-none focus:ring-4 focus:ring-[#bfdbfe]"
          value={activeTab}
          onChange={(event) => onTabChange(event.target.value as EntityTabKey)}
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
      className={`flex flex-wrap gap-2 border-b border-[#d7dce5] pb-3 ${
        tabsClassName ?? ""
      }`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`rounded-xl border px-3 py-1.5 text-sm font-semibold normal-case tracking-normal transition ${
            activeTab === tab.key
              ? "border-[#d6422b] bg-[#d6422b] text-white shadow-sm"
              : "border-transparent bg-white text-[#334155] hover:border-[#d7dce5] hover:bg-[#f8fafc] hover:text-[#0f172a]"
          }`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
