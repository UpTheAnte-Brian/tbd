"use client";

import { useMemo } from "react";
import type { EntityType } from "@/domain/entities/types";
import EntityOverviewTab from "@/app/components/entities/tabs/overview/EntityOverviewTab";
import EntityBrandingTab from "@/app/components/entities/tabs/branding/EntityBrandingTab";
import EntityUsersTab from "@/app/components/entities/tabs/users/EntityUsersTab";
import EntityMapTab from "@/app/components/entities/tabs/map/EntityMapTab";
import EntityGovernanceTab from "@/app/components/entities/tabs/governance/EntityGovernanceTab";
import type { TabKey } from "@/app/components/entities/hooks/useEntityTabParam";

type Props = {
  entityId: string;
  entityType: EntityType | null;
  entityName?: string;
  activeTab: TabKey;
};

export default function EntityPanelContent({
  entityId,
  entityType,
  entityName,
  activeTab,
}: Props) {
  const tabContent = useMemo(() => {
    if (!entityType) {
      return (
        <div className="rounded border border-dashed border-brand-secondary-1 p-4 text-sm text-brand-secondary-0">
          Entity type not available.
        </div>
      );
    }

    switch (activeTab) {
      case "overview":
        return (
          <EntityOverviewTab
            entityId={entityId}
            entityType={entityType}
            entityName={entityName ?? "Entity"}
          />
        );
      case "branding":
        return (
          <EntityBrandingTab
            entityId={entityId}
            entityType={entityType}
            entityName={entityName ?? "Entity"}
          />
        );
      case "users":
        return <EntityUsersTab entityId={entityId} />;
      case "map":
        return <EntityMapTab entityId={entityId} entityType={entityType} />;
      case "governance":
        return (
          <EntityGovernanceTab entityId={entityId} entityType={entityType} />
        );
      default:
        return null;
    }
  }, [activeTab, entityId, entityName, entityType]);

  return <div>{tabContent}</div>;
}
