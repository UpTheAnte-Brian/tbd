import { getResolvedEntityBranding } from "@/app/data/entity-branding";
import { EntityThemeProviderClient } from "@/app/providers/EntityThemeProviderClient";
import type { ResolvedBranding } from "@/app/lib/branding/resolveBranding";
import type { ReactNode } from "react";

interface Props {
  entityId: string | null;
  children: ReactNode;
}

export default async function EntityThemeProvider({
  entityId,
  children,
}: Props) {
  let resolved: ResolvedBranding | null = null;
  let resolvedEntityId = entityId;

  if (entityId) {
    try {
      const result = await getResolvedEntityBranding(entityId);
      resolved = { colors: result.colors, typography: result.typography };
      resolvedEntityId = result.entityId;
    } catch (err) {
      console.warn("Failed to resolve entity branding:", err);
    }
  }

  return (
    <EntityThemeProviderClient
      entityId={resolvedEntityId}
      resolved={resolved}
    >
      {children}
    </EntityThemeProviderClient>
  );
}
