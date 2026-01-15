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
import { useState } from "react";

type Props = {
  palettes: Record<PaletteRole, CanonicalPalette>;
  canEdit: boolean;
  onUpdateSlot: (args: {
    role: PaletteRole;
    slot: number;
    hex: string | null;
  }) => Promise<void>;
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
  onUpdateSlot,
}: Props) {
  const [editingSlot, setEditingSlot] = useState<{
    role: PaletteRole;
    slot: number;
  } | null>(null);
  const [draftHex, setDraftHex] = useState<string>("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const editKey = (role: PaletteRole, slot: number) => `${role}:${slot}`;

  const startEditing = (role: PaletteRole, slot: number, hex: string) => {
    if (!canEdit) return;
    const isSame =
      editingSlot?.role === role && editingSlot?.slot === slot;
    if (isSame) {
      setEditingSlot(null);
      return;
    }
    setEditingSlot({ role, slot });
    setDraftHex(normalizeHex(hex) ?? hex);
  };

  const handleSave = async (role: PaletteRole, slot: number) => {
    const hex = normalizeHex(draftHex) ?? draftHex;
    if (!hex) return;
    const key = editKey(role, slot);
    setSavingKey(key);
    try {
      await onUpdateSlot({ role, slot, hex });
      setEditingSlot(null);
    } catch (error) {
      console.error("Failed to save palette slot", error);
    } finally {
      setSavingKey(null);
    }
  };

  const handleReset = async (role: PaletteRole, slot: number) => {
    const key = editKey(role, slot);
    setSavingKey(key);
    try {
      await onUpdateSlot({ role, slot, hex: null });
      setEditingSlot(null);
    } catch (error) {
      console.error("Failed to reset palette slot", error);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="mt-2 rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4">
      {canEdit ? (
        <div className="mb-4 flex justify-center">
          <div className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow">
            Click a color tile to customize to your brand
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-4">
        {PALETTE_ROLES.map((role) => {
          const palette = palettes[role];
          const isInitialized = !!palette?.id && !palette.isPlaceholder;

          const actionLabel = canEdit
            ? isInitialized
              ? `Edit ${titleCaseRole(role)}`
              : `Initialize ${titleCaseRole(role)}`
            : titleCaseRole(role);

          return (
            <div key={role} className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {palette.slots.map((slot) => {
                const isEditing =
                  editingSlot?.role === role && editingSlot?.slot === slot.slot;
                const displayHex = isEditing ? draftHex || slot.hex : slot.hex;
                const bg = normalizeHex(displayHex) ?? slot.hex;
                const textColor = bestTextColor(bg);
                const lowContrast = isLowContrast(textColor, bg);
                const tag = suggestedUse(role, slot.slot);
                const isUsingDefaults = !isInitialized || palette.isIncomplete;
                const isSaving = savingKey === editKey(role, slot.slot);

                return (
                  <div key={`${palette.key}-${slot.slot}`} className="group">
                    {/* Use a div (role=button) so we can have a real Reset <button> without nesting */}
                    <div
                      role={canEdit ? "button" : undefined}
                      tabIndex={canEdit ? 0 : -1}
                      onClick={
                        canEdit
                          ? () => startEditing(role, slot.slot, slot.hex)
                          : undefined
                      }
                      onKeyDown={
                        canEdit
                          ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                startEditing(role, slot.slot, slot.hex);
                              }
                            }
                          : undefined
                      }
                      className={`relative flex min-h-[120px] w-full flex-col justify-between rounded p-4 text-left outline-none ${
                        canEdit ? "cursor-pointer" : "cursor-default"
                      } ${
                        isUsingDefaults
                          ? "border-2 border-dotted border-brand-secondary-1"
                          : "border border-solid border-brand-secondary-1"
                      }`}
                      style={{
                        backgroundColor: bg,
                        color: textColor,
                      }}
                      aria-label={`${actionLabel} (${titleCaseRole(
                        role
                      )} slot ${slot.slot})`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          <div className="text-[16px] font-semibold uppercase tracking-wide">
                            {titleCaseRole(role)}
                          </div>
                          <div className="text-[14px] font-semibold opacity-90">
                            {slot.slot}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {slot.isOverride ? (
                            <span
                              className="rounded border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
                              style={{
                                borderColor: textColor,
                                color: textColor,
                              }}
                            >
                              Override
                            </span>
                          ) : null}

                          {lowContrast ? (
                            <span
                              className="rounded border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
                              style={{
                                borderColor: textColor,
                                color: textColor,
                              }}
                            >
                              Low contrast
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-[13px] opacity-90 break-all">
                        {displayHex}
                      </div>

                      <div className="text-[14px] uppercase tracking-wide opacity-80">
                        Slot {slot.slot}
                      </div>

                      {tag && !isEditing ? (
                        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center opacity-0 transition-opacity group-hover:opacity-100">
                          <span
                            className="rounded border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
                            style={{
                              borderColor: textColor,
                              color: textColor,
                              backgroundColor: "transparent",
                            }}
                          >
                            {tag}
                          </span>
                        </div>
                      ) : null}

                      {isEditing ? (
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            type="color"
                            value={normalizeHex(draftHex) ?? slot.hex}
                            onChange={(event) => setDraftHex(event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            className="h-7 w-7 rounded border border-brand-secondary-1 bg-brand-secondary-2"
                            aria-label={`Pick ${titleCaseRole(role)} slot ${slot.slot} color`}
                          />
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleSave(role, slot.slot);
                            }}
                            disabled={isSaving}
                            className="rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest"
                            style={{
                              borderColor: textColor,
                              color: textColor,
                            }}
                          >
                            {isSaving ? "Saving" : "Save"}
                          </button>
                          {slot.isOverride ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleReset(role, slot.slot);
                              }}
                              disabled={isSaving}
                              className="rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest"
                              style={{
                                borderColor: textColor,
                                color: textColor,
                              }}
                            >
                              Default
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
