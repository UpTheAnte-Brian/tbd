"use client";

import GovernancePanel from "@/app/components/entities/tabs/governance/GovernancePanel";
import type { EntityType } from "@/domain/entities/types";

type Props = {
  entityId: string;
  entityType: EntityType | null;
};

export default function EntityGovernanceTab({ entityId, entityType }: Props) {
  if (entityType !== "nonprofit" && entityType !== "district") {
    return (
      <div className="rounded-xl border border-dashed border-border-subtle bg-surface-card p-4 text-sm text-brand-secondary-0">
        Governance is only available for nonprofits and districts.
      </div>
    );
  }

  return <GovernancePanel entityId={entityId} entityType={entityType} />;
}
