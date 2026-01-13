"use client";

import {
  bestTextColor,
  isLowContrast,
  normalizeHex,
} from "@/app/lib/branding/colorUtils";
import {
  PALETTE_ROLES,
  type CanonicalPalette,
  type PaletteRole,
} from "@/app/lib/branding/resolveBranding";
import React from "react";

type Props = {
  palettes: Record<PaletteRole, CanonicalPalette>;
  canEdit: boolean;
  onEditPalette: (palette: CanonicalPalette) => void;
};

const suggestedUse = (role: PaletteRole, index: number): string | null => {
  if (role === "primary" && index === 1) return "Background";
  if (role === "secondary" && index === 1) return "Ink";
  if (role === "accent" && index === 0) return "Calls To Action";
  return null;
};

const titleCaseRole = (role: PaletteRole): string =>
  role.charAt(0).toUpperCase() + role.slice(1);

export default function BrandPaletteGrid({
  palettes,
  canEdit,
  onEditPalette,
}: Props) {
  return (
    <div className="mt-2 overflow-x-auto rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4">
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "minmax(190px, 240px) repeat(3, minmax(0, 1fr))",
        }}
      >
        {PALETTE_ROLES.map((role) => {
          const palette = palettes[role];
          const isInitialized = !!palette?.id && !palette.isPlaceholder;

          const actionLabel = canEdit
            ? isInitialized
              ? `Edit ${titleCaseRole(role)}`
              : `Initialize ${titleCaseRole(role)}`
            : titleCaseRole(role);

          const onAction = () => {
            if (!canEdit) return;
            onEditPalette(palette);
          };

          return (
            <React.Fragment key={role}>
              {/* Column 1: actions + status (stacked) */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onAction}
                  disabled={!canEdit}
                  className="w-full rounded border border-brand-secondary-1 bg-brand-secondary-0 px-3 py-2 text-left text-[12px] uppercase tracking-wide text-brand-secondary-2 disabled:cursor-default disabled:opacity-60"
                >
                  {actionLabel}
                </button>

                <div className="rounded border border-brand-secondary-1 bg-brand-secondary-2 px-3 py-2 text-[11px] uppercase tracking-wide text-brand-secondary-0">
                  {isInitialized
                    ? "Initialized"
                    : palette.isIncomplete
                    ? "Using defaults"
                    : "Not initialized"}
                </div>
              </div>

              {/* Columns 2-4: slot tiles */}
              {palette.colors.map((color, idx) => {
                const bg = normalizeHex(color) ?? color;
                const textColor = bestTextColor(bg);
                const lowContrast = isLowContrast(textColor, bg);
                const tag = suggestedUse(role, idx);
                const label = `${titleCaseRole(role)} ${idx}`;

                return (
                  <button
                    key={`${palette.key}-${idx}`}
                    type="button"
                    onClick={onAction}
                    disabled={!canEdit}
                    className="relative flex min-h-[120px] w-full flex-col justify-between rounded border border-brand-secondary-1 p-4 text-left disabled:cursor-default disabled:opacity-100"
                    style={{
                      backgroundColor: bg,
                      color: textColor,
                    }}
                    aria-label={`${actionLabel} (slot ${idx})`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[18px] font-semibold uppercase tracking-wide">
                        {label}
                      </div>

                      {lowContrast ? (
                        <span
                          className="rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest"
                          style={{
                            borderColor: textColor,
                            color: textColor,
                          }}
                        >
                          Low contrast
                        </span>
                      ) : null}
                    </div>

                    <div className="text-[14px] opacity-90 break-all">{bg}</div>

                    {tag ? (
                      <span
                        className="mt-3 inline-flex w-fit items-center rounded border px-4 py-2 text-[16px] font-semibold uppercase tracking-wide"
                        style={{
                          borderColor: textColor,
                          color: textColor,
                          backgroundColor: "transparent",
                        }}
                      >
                        {tag}
                      </span>
                    ) : (
                      <div className="text-[14px] uppercase tracking-wide opacity-80">
                        Slot {idx}
                      </div>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
