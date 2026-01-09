"use client";

import GovernancePanel from "@/app/components/entities/tabs/governance/GovernancePanel";
import type { EntityType } from "@/app/lib/types/types";

type Props = {
  entityId: string;
  entityType: EntityType | null;
};

export default function EntityGovernanceTab({ entityId, entityType }: Props) {
  if (entityType !== "nonprofit") {
    return (
      <div className="rounded border border-dashed border-brand-secondary-1 p-4 text-sm text-brand-secondary-0">
        Governance is only available for nonprofits.
      </div>
    );
  }

  return <GovernancePanel nonprofitId={entityId} />;
}
