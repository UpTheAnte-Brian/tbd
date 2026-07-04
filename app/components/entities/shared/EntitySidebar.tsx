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
    <aside className="hidden md:block w-72 shrink-0 md:sticky md:top-4 md:self-start">
      <div className="rounded-[24px] border border-border-subtle bg-surface-card p-5 text-text-on-light shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        {entityType ? (
          <EntityLogo
            entityId={entityId}
            entityType={entityType}
            fullWidth
            minHeight={80}
            fallbackName={entityName}
            fallbackType={entityType}
            className="w-full rounded-[18px] border border-border-subtle bg-surface-inset p-3"
          />
        ) : null}
        <nav className="mt-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm font-semibold normal-case tracking-normal transition ${
                activeTab === tab.key
                  ? "border-brand-primary-2 bg-surface-accent text-text-on-dark shadow-sm"
                  : "border-transparent bg-surface-card text-text-on-light hover:border-border-subtle hover:bg-surface-inset"
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
