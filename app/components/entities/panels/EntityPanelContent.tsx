"use client";

import { useMemo } from "react";
import EntityOverviewTab from "@/app/components/entities/tabs/overview/EntityOverviewTab";
import EntityContactsTab from "@/app/components/entities/tabs/contacts/EntityContactsTab";
import EntityBrandingTab from "@/app/components/entities/tabs/branding/EntityBrandingTab";
import EntityIrsTab from "@/app/components/entities/tabs/irs/EntityIrsTab";
import EntityMapTab from "@/app/components/entities/tabs/map/EntityMapTab";
import EntityGovernanceTab from "@/app/components/entities/tabs/governance/EntityGovernanceTab";
import EntityUsersTab from "@/app/components/entities/tabs/users/EntityUsersTab";
import EntitySuperintendentTab from "@/app/components/entities/tabs/superintendent/EntitySuperintendentTab";
import type { EntityTabKey } from "@/app/components/entities/entityTabs";
import type { EntityType } from "@/domain/entities/types";

type Props = {
  entityId: string;
  entityType: EntityType | null;
  entityName?: string;
  activeTab: EntityTabKey;
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
        return <EntityOverviewTab entityId={entityId} />;
      case "contacts":
        return <EntityContactsTab entityId={entityId} />;
      case "branding":
        return (
          <EntityBrandingTab
            entityId={entityId}
            entityType={entityType}
            entityName={entityName ?? "Entity"}
          />
        );
      case "map":
        return (
          <EntityMapTab
            entityId={entityId}
            entityType={entityType}
          />
        );
      case "governance":
        return (
          <EntityGovernanceTab
            entityId={entityId}
            entityType={entityType}
          />
        );
      case "users":
        return <EntityUsersTab entityId={entityId} />;
      case "irs":
        return <EntityIrsTab entityId={entityId} />;
      case "superintendent":
        return (
          <EntitySuperintendentTab
            entityId={entityId}
            entityType={entityType}
          />
        );
      default:
        return null;
    }
  }, [activeTab, entityId, entityName, entityType]);

  return <div>{tabContent}</div>;
}
