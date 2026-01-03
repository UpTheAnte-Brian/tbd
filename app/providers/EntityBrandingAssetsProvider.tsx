import { getResolvedEntityAssets } from "@/app/data/entity-assets";
import { EntityBrandingAssetsProviderClient } from "@/app/providers/EntityBrandingAssetsProviderClient";
import type { ReactNode } from "react";

type Props = {
  entityId: string | null;
  children: ReactNode;
};

export default async function EntityBrandingAssetsProvider({
  entityId,
  children,
}: Props) {
  let resolvedAssets = null;
  let resolvedEntityId = entityId;

  if (entityId) {
    try {
      resolvedAssets = await getResolvedEntityAssets(entityId);
      resolvedEntityId = resolvedAssets.entityId;
    } catch (err) {
      console.warn("Failed to resolve entity assets:", err);
    }
  }

  return (
    <EntityBrandingAssetsProviderClient
      entityId={resolvedEntityId}
      resolvedAssets={resolvedAssets}
    >
      {children}
    </EntityBrandingAssetsProviderClient>
  );
}
