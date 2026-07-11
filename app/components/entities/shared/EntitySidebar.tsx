"use client";

import { EntityLogo } from "@/app/components/branding/EntityLogo";
import {
  getEntityTabLabel,
  getVisibleEntityTabKeys,
  type EntityTabContext,
  type EntityTabKey,
} from "@/app/components/entities/entityTabs";

type Props = {
  entityId: string;
  entityName: string;
  entityType: EntityTabContext["entityType"];
  activeTab: EntityTabKey;
  onTabChange: (tab: EntityTabKey) => void;
  allowedTabs?: EntityTabKey[];
  tabContext: EntityTabContext;
};

export default function EntitySidebar({
  entityId,
  entityName,
  entityType,
  activeTab,
  onTabChange,
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
  return (
    <aside className="hidden md:block md:sticky md:top-20 md:self-start">
      <div className="overflow-hidden rounded-[24px] border border-border-subtle bg-surface-card p-5 text-text-on-light shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        {entityType ? (
          <EntityLogo
            entityId={entityId}
            entityType={entityType}
            fullWidth
            minHeight={112}
            fallbackName={entityName}
            fallbackType={entityType}
            className="w-full rounded-[18px] border border-border-subtle bg-surface-inset p-4"
          />
        ) : null}
        <div className="mt-5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-secondary-0 opacity-70">
          <span>Workspace</span>
          <span>{tabs.length} views</span>
        </div>
        <nav className="mt-3 max-h-[calc(100vh-16rem)] space-y-1.5 overflow-y-auto pr-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold normal-case tracking-normal transition ${
                activeTab === tab.key
                  ? "border-brand-primary-2 bg-surface-accent text-text-on-dark shadow-sm"
                  : "border-border-subtle bg-surface-page text-text-on-light hover:border-brand-secondary-1 hover:bg-surface-inset"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
