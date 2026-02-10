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
          className="mt-1 w-full rounded border border-brand-secondary-1 bg-brand-secondary-2 px-3 py-2 text-sm text-brand-secondary-0"
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
