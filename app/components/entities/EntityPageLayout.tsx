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
  children: ReactNode;
};

export default function EntityPageLayout({
  entityId,
  entityName,
  entityType,
  activeTab,
  onTabChange,
  children,
}: Props) {
  return (
    <div className="md:flex md:gap-8">
      <EntitySidebar
        entityId={entityId}
        entityName={entityName}
        entityType={entityType}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
      <div className="flex-1">
        <div className="max-w-5xl space-y-6">{children}</div>
      </div>
    </div>
  );
}
