"use client";

import { ReactNode } from "react";
import type { EntityType } from "@/app/lib/types/types";
import EntitySidebar from "@/app/components/entities/shared/EntitySidebar";

type TabKey = "overview" | "branding" | "users" | "map";

type Props = {
  entityId: string;
  entityName: string;
  entityType: EntityType | null;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  mobileHeader?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
};

export default function EntityPageLayout({
  entityId,
  entityName,
  entityType,
  activeTab,
  onTabChange,
  mobileHeader,
  tabs,
  children,
}: Props) {
  return (
    <div className="md:flex md:items-start md:gap-4 md:pt-4">
      {mobileHeader || tabs ? (
        <div className="mb-6 space-y-4 md:hidden md:mb-0">
          {mobileHeader}
          {tabs}
        </div>
      ) : null}
      <EntitySidebar
        entityId={entityId}
        entityName={entityName}
        entityType={entityType}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
      <div className="flex-1 md:pl-4 md:border-l md:border-brand-secondary-1">
        <div className="max-w-5xl space-y-6 md:space-y-0">{children}</div>
      </div>
    </div>
  );
}
