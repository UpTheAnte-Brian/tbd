"use client";

import { ReactNode } from "react";
import type {
  EntityTabContext,
  EntityTabKey,
} from "@/app/components/entities/entityTabs";
import type { EntityType } from "@/domain/entities/types";
import EntitySidebar from "@/app/components/entities/shared/EntitySidebar";

type Props = {
  entityId: string;
  entityName: string;
  entityType: EntityType | null;
  activeTab: EntityTabKey;
  onTabChange: (tab: EntityTabKey) => void;
  mobileHeader?: ReactNode;
  tabs?: ReactNode;
  allowedTabs?: EntityTabKey[];
  tabContext: EntityTabContext;
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
  allowedTabs,
  tabContext,
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
        allowedTabs={allowedTabs}
        tabContext={tabContext}
      />
      <div className="flex-1 min-w-0 md:pl-4">
        <div className="w-full space-y-6 md:space-y-0">{children}</div>
      </div>
    </div>
  );
}
