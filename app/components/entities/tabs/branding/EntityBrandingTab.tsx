"use client";

import EntityBrandingPanel from "@/app/components/branding/panels/EntityBrandingPanel";
import type { EntityType } from "@/app/lib/types/types";

type Props = {
  entityId: string;
  entityType: EntityType;
  entityName: string;
};

export default function EntityBrandingTab({
  entityId,
  entityType,
  entityName,
}: Props) {
  return (
    <EntityBrandingPanel
      entityId={entityId}
      entityType={entityType}
      entityName={entityName}
    />
  );
}
