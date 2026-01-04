"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import BrandAssetsSection from "@/app/components/branding/panels/BrandAssetsSection";
import BrandPalettesSection from "@/app/components/branding/panels/BrandPalettesSection";
import BrandTypographySection from "@/app/components/branding/panels/BrandTypographySection";
import { useBrandingAssets } from "@/app/hooks/useBrandingAssets";
import { useEntityBranding } from "@/app/hooks/useEntityBranding";
import { useUser } from "@/app/hooks/useUser";
import { hasEntityRole } from "@/app/lib/auth/entityRoles";
import type { EntityType } from "@/app/lib/types/types";

interface Props {
  entityId: string | null;
  entityType: EntityType;
  entityName?: string;
  onRefresh?: () => void;
}

export default function EntityBrandingPanel({
  entityId,
  entityType,
  entityName = "Entity",
  onRefresh,
}: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useUser();

  const {
    slots,
    categories,
    subcategories,
    assets,
    loading: assetsLoading,
    error: assetsError,
  } = useBrandingAssets(entityId, entityType, refreshKey);

  const {
    data: branding,
    loading: brandingLoading,
    error: brandingError,
  } = useEntityBranding(entityId, refreshKey);

  const loading = assetsLoading || brandingLoading;
  const error = assetsError || brandingError;

  const canEdit =
    user?.global_role === "admin" ||
    (entityId
      ? hasEntityRole(user?.entity_users ?? [], entityType, entityId, ["admin"])
      : false);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    onRefresh?.();
  };

  if (!entityId) {
    return (
      <div className="italic text-brand-secondary-0 opacity-70">
        Select an entity...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-brand-secondary-0 opacity-80">
        <Loader2 className="animate-spin" size={20} />
        Loading branding...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-brand-primary-2">
        <AlertCircle size={20} />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <BrandAssetsSection
        entityId={entityId}
        entityType={entityType}
        slots={slots}
        categories={categories}
        subcategories={subcategories}
        assets={assets}
        canEdit={canEdit}
        onRefresh={handleRefresh}
      />

      <BrandPalettesSection
        entityId={entityId}
        entityName={entityName}
        palettes={branding?.palettes ?? []}
        canEdit={canEdit}
        onRefresh={handleRefresh}
      />

      <BrandTypographySection
        entityId={entityId}
        typography={branding?.typography ?? []}
        canEdit={canEdit}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
