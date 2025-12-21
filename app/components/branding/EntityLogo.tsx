"use client";

import React from "react";
import { EntityType } from "@/app/lib/types/types";
import DistrictPrimaryLogo from "@/app/components/districts/branding/DistrictPrimaryLogo";

type Props = {
  entityId: string;
  entityType: EntityType;
  className?: string;
  size?: number;
};

/**
 * Placeholder component for rendering an entity logo.
 * Currently shows a neutral badge with entity type; replace the image lookup once branding is entity-based.
 */
export function EntityLogo({
  entityId,
  entityType,
  className,
  size = 48,
}: Props) {
  if (entityType === "district") {
    return (
      <DistrictPrimaryLogo
        entityId={entityId}
        districtName={undefined}
        entityType="district"
      />
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-md bg-gray-200 text-gray-700 text-xs font-semibold ${className ?? ""}`}
      style={{ width: size, height: size }}
      title={`${entityType} • ${entityId}`}
    >
      {entityType}
    </div>
  );
}
