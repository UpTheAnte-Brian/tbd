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
          className="w-full rounded-2xl border border-border-subtle bg-surface-card px-4 py-3 text-sm font-medium text-text-on-light shadow-sm focus:border-brand-accent-1 focus:outline-none focus:ring-4 focus:ring-focus-ring/20"
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
      className={`flex flex-wrap gap-2 border-b border-border-subtle pb-3 ${
        tabsClassName ?? ""
      }`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`rounded-2xl border px-4 py-2 text-sm font-semibold normal-case tracking-normal transition ${
            activeTab === tab.key
              ? "border-brand-primary-2 bg-surface-accent text-text-on-dark shadow-sm"
              : "border-border-subtle bg-surface-card text-text-on-light hover:border-brand-secondary-1 hover:bg-surface-inset"
          }`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
