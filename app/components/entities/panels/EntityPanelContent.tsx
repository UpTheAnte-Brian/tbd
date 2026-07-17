"use client";

import { useMemo } from "react";
import EntityOverviewTab from "@/app/components/entities/tabs/overview/EntityOverviewTab";
import EntityDocumentsTab from "@/app/components/entities/tabs/documents/EntityDocumentsTab";
import EntityContactsTab from "@/app/components/entities/tabs/contacts/EntityContactsTab";
import EntityPeopleTab from "@/app/components/entities/tabs/people/EntityPeopleTab";
import EntityBookkeepingTab from "@/app/components/entities/tabs/bookkeeping/EntityBookkeepingTab";
import EntityBrandingTab from "@/app/components/entities/tabs/branding/EntityBrandingTab";
import EntityIrsTab from "@/app/components/entities/tabs/irs/EntityIrsTab";
import EntityMapTab from "@/app/components/entities/tabs/map/EntityMapTab";
import EntityGovernanceTab from "@/app/components/entities/tabs/governance/EntityGovernanceTab";
import EntityUsersTab from "@/app/components/entities/tabs/users/EntityUsersTab";
import EntitySuperintendentTab from "@/app/components/entities/tabs/superintendent/EntitySuperintendentTab";
import EntityAgentTab from "@/app/components/entities/tabs/agent/EntityAgentTab";
import type { EntityTabKey } from "@/app/components/entities/entityTabs";
import type { EntityType } from "@/domain/entities/types";

type Props = {
  entityId: string;
  entityType: EntityType | null;
  entityName?: string;
  activeTab: EntityTabKey;
  canManageContacts?: boolean;
};

export default function EntityPanelContent({
  entityId,
  entityType,
  entityName,
  activeTab,
  canManageContacts = false,
}: Props) {
  const tabContent = useMemo(() => {
    if (!entityType) {
      return (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface-card p-4 text-sm text-brand-secondary-0">
          Entity type not available.
        </div>
      );
    }

    switch (activeTab) {
      case "overview":
        return <EntityOverviewTab entityId={entityId} />;
      case "documents":
        return <EntityDocumentsTab entityId={entityId} />;
      case "contacts":
        return (
          <EntityContactsTab
            entityId={entityId}
            canManageContacts={canManageContacts}
          />
        );
      case "people":
        return (
          <EntityPeopleTab
            entityId={entityId}
            entityType={entityType}
          />
        );
      case "bookkeeping":
        return <EntityBookkeepingTab entityId={entityId} />;
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
      case "agent":
        return (
          <EntityAgentTab
            entityId={entityId}
            entityName={entityName ?? "Entity"}
          />
        );
      case "users":
        return (
          <EntityUsersTab
            entityId={entityId}
            entityType={entityType}
          />
        );
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
  }, [activeTab, canManageContacts, entityId, entityName, entityType]);

  return <div>{tabContent}</div>;
}
