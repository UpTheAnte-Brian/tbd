"use client";

import { EntityType } from "@/app/lib/types/types";
import { useBrandAssets } from "@/app/providers/EntityBrandingAssetsProviderClient";

type Props = {
  entityId: string;
  entityType: EntityType;
  preferredSlotKeys?: string[];
  className?: string;
  size?: number;
  fullWidth?: boolean;
  minHeight?: number;
  fillContainer?: boolean;
  fallbackName?: string;
  fallbackType?: string | null;
};

export function EntityLogo({
  entityId,
  entityType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  preferredSlotKeys: _preferredSlotKeys = ["primary", "logo", "icon", "mark"],
  className,
  size = 48,
  fullWidth = false,
  minHeight,
  fillContainer = false,
  fallbackName,
  fallbackType,
}: Props) {
  const { assets } = useBrandAssets();
  const logoUrl = assets.primaryLogoUrl;

  if (logoUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-md border border-brand-secondary-1 bg-brand-secondary-2 overflow-hidden ${
          className ?? ""
        }`}
        style={
          fillContainer
            ? { width: "100%", height: "100%" }
            : fullWidth
            ? { width: "100%", height: minHeight ?? size }
            : { width: size, height: size }
        }
        title={`${entityType} • ${entityId}`}
      >
        <img
          src={logoUrl}
          alt={`${entityType} logo`}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-md border border-brand-secondary-1 bg-brand-secondary-2 text-brand-secondary-0 text-xs font-semibold ${
        className ?? ""
      }`}
      style={
        fillContainer
          ? { width: "100%", height: "100%" }
          : fullWidth
          ? { width: "100%", height: minHeight ?? size }
          : { width: size, height: size }
      }
      title={`${entityType} • ${entityId}`}
    >
      {fallbackName ? (
        <>
          <div className="text-sm font-semibold">{fallbackName}</div>
          {fallbackType ? (
            <div className="text-xs opacity-70 capitalize">{fallbackType}</div>
          ) : null}
        </>
      ) : (
        entityType
      )}
    </div>
  );
}
