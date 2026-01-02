"use client";

import { EntityLogo } from "@/app/components/branding/EntityLogo";
import BrandPaletteCube from "@/app/components/branding/BrandPaletteCube";
import type { EntityType } from "@/app/lib/types/types";

type TabKey = "overview" | "branding" | "users" | "map";

type Props = {
  entityId: string;
  entityName: string;
  entityType: EntityType | null;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
};

const TAB_ORDER: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "branding", label: "Branding" },
  { key: "users", label: "Users" },
  { key: "map", label: "Map" },
];

export default function EntitySidebar({
  entityId,
  entityName,
  entityType,
  activeTab,
  onTabChange,
}: Props) {
  return (
    <aside className="hidden md:block md:w-72">
      <div className="sticky top-20 rounded border border-brand-secondary-1 bg-brand-secondary-0 p-4 text-brand-primary-0">
        <div className="flex flex-col items-start gap-3">
          {entityType ? (
            <EntityLogo
              entityId={entityId}
              entityType={entityType}
              size={120}
              className="rounded-lg p-2 w-full bg-brand-secondary-0 border border-brand-secondary-1"
            />
          ) : null}
          <div className="w-full">
            <div className="text-lg font-semibold text-brand-primary-0">
              {entityName}
            </div>
            {entityType ? (
              <div className="text-xs text-brand-secondary-2 capitalize">
                {entityType}
              </div>
            ) : null}
          </div>
        </div>
        <nav className="mt-4 space-y-2">
          {TAB_ORDER.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`w-full rounded px-3 py-2 text-left text-sm transition ${
                activeTab === tab.key
                  ? "bg-brand-primary-1 text-brand-secondary-0"
                  : "bg-brand-secondary-1 text-brand-primary-0 hover:bg-brand-secondary-2"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="mt-6">
          <BrandPaletteCube />
        </div>
      </div>
    </aside>
  );
}
