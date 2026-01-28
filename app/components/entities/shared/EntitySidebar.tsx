"use client";

import { EntityLogo } from "@/app/components/branding/EntityLogo";
import BrandPaletteCube from "@/app/components/branding/BrandPaletteCube";
import type { TabKey } from "@/app/components/entities/hooks/useEntityTabParam";
import type { EntityType } from "@/domain/entities/types";

type Props = {
  entityId: string;
  entityName: string;
  entityType: EntityType | null;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
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
    return [BASE_TABS[0], SUPERINTENDENT_TAB, ...BASE_TABS.slice(1)];
  }
  if (entityType !== "nonprofit") {
    return BASE_TABS;
  }
  return [...BASE_TABS.slice(0, 3), GOVERNANCE_TAB, ...BASE_TABS.slice(3)];
}

export default function EntitySidebar({
  entityId,
  entityName,
  entityType,
  activeTab,
  onTabChange,
  allowedTabs,
}: Props) {
  const tabs = allowedTabs?.length
    ? allowedTabs.map((key) => ({ key, label: TAB_LABELS[key] }))
    : getTabs(entityType);
  return (
    <aside className="hidden md:block w-72 shrink-0">
      <div className="sticky top-4 rounded border border-brand-secondary-1 bg-brand-secondary-0 p-4 text-brand-secondary-2">
        {entityType ? (
          <EntityLogo
            entityId={entityId}
            entityType={entityType}
            fullWidth
            minHeight={80}
            fallbackName={entityName}
            fallbackType={entityType}
            className="w-full rounded-md border border-brand-secondary-1 bg-brand-secondary-2 p-2"
          />
        ) : null}
        <nav className="mt-2 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                activeTab === tab.key
                  ? "bg-brand-primary-0 text-brand-secondary-2"
                  : "bg-transparent text-brand-secondary-2 hover:bg-brand-primary-2"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="mt-6 flex justify-center">
          <div className="w-24">
            <BrandPaletteCube />
          </div>
        </div>
      </div>
    </aside>
  );
}
