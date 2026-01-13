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

export default function BrandPaletteGrid({
  palettes,
  canEdit,
  onEditPalette,
}: Props) {
  return (
    <div className="mt-2 rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4">
      <div className="grid gap-4 md:grid-cols-3">
        {PALETTE_ROLES.map((role) => {
          const palette = palettes[role];
          return (
            <div key={palette.key} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 text-brand-secondary-0">
                {canEdit ? (
                  <button
                    type="button"
                    className="w-fit rounded bg-brand-secondary-0 px-2 py-1 text-[10px] uppercase tracking-wide text-brand-secondary-2 hover:bg-brand-secondary-1"
                    onClick={() => onEditPalette(palette)}
                  >
                    {palette.isPlaceholder ? "Initialize" : "Edit"}{" "}
                    {palette.label}
                  </button>
                ) : null}
                {palette.isPlaceholder ? (
                  <span className="w-fit rounded border border-dashed border-brand-secondary-1 px-2 py-0.5 text-[10px] uppercase tracking-wide opacity-70">
                    Not initialized
                  </span>
                ) : palette.isIncomplete ? (
                  <span className="w-fit rounded border border-dashed border-brand-secondary-1 px-2 py-0.5 text-[10px] uppercase tracking-wide opacity-70">
                    Using defaults
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3">
                {palette.colors.map((color, idx) => {
                  const textColor = bestTextColor(color);
                  const lowContrast = isLowContrast(textColor, color);
                  const warningColor = bestTextColor(textColor);
                  const tag = suggestedUse(palette.role, idx);
                  const label = `${palette.label.toUpperCase()} ${idx}`;
                  return (
                    <button
                      key={`${palette.key}-${idx}`}
                      type="button"
                      className="flex h-28 w-full flex-col justify-between rounded border border-brand-secondary-1 p-3 text-left disabled:cursor-default disabled:opacity-100"
                      style={{ backgroundColor: color, color: textColor }}
                      onClick={() => onEditPalette(palette)}
                      disabled={!canEdit}
                    >
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider opacity-80">
                        <span>{label}</span>
                        {lowContrast ? (
                          <span
                            className="rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-widest"
                            style={{
                              borderColor: warningColor,
                              color: warningColor,
                            }}
                          >
                            Low contrast
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm font-semibold">
                        {normalizeHex(color) ?? color}
                      </div>
                      {tag ? (
                        <span
                          className="inline-flex w-fit rounded border px-2 py-0.5 text-[9px] uppercase tracking-wider"
                          style={{ borderColor: textColor, color: textColor }}
                        >
                          {tag}
                        </span>
                      ) : (
                        <span className="text-[9px] uppercase tracking-wider opacity-70">
                          Slot {idx}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
