"use client";

import EntityBrandingPanel from "@/app/components/branding/panels/EntityBrandingPanel";
import type { EntityType } from "@/app/lib/types/types";

interface Props {
  entityId: string | null;
  entityType: EntityType;
  entityName?: string;
}

export function BrandingPanel({ entityId, entityType, entityName }: Props) {
  return (
    <EntityBrandingPanel
      entityId={entityId}
      entityType={entityType}
      entityName={entityName}
    />
  );
}
