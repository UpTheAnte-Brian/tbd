"use client";

import { useMemo } from "react";
import { Palette as PaletteIcon } from "lucide-react";
import AccordionCard from "@/app/components/user/AccordionCard";
import BrandPaletteGrid from "@/app/components/branding/BrandPaletteGrid";
import {
  toPaletteMap,
  type CanonicalPalettes,
  type PaletteRole,
} from "@/app/lib/branding/resolveBranding";
import type { BrandingPalette } from "@/app/lib/types/types";

interface Props {
  entityId: string | null;
  entityName: string;
  palettes: BrandingPalette[];
  canEdit: boolean;
  onRefresh: () => void;
}

export default function BrandPalettesSection({
  entityId,
  entityName,
  palettes,
  canEdit,
  onRefresh,
}: Props) {
  const paletteMap = useMemo<CanonicalPalettes>(
    () => toPaletteMap(palettes, entityName),
    [palettes, entityName]
  );

  const updatePaletteSlot = async (args: {
    role: PaletteRole;
    slot: number;
    hex: string | null;
  }) => {
    if (!entityId) return;
    const res = await fetch(
      `/api/entities/${entityId}/branding/palettes/${args.role}/colors/${args.slot}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hex: args.hex }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || "Failed to update palette slot");
    }
  };

  const handleUpdateSlot = async (args: {
    role: PaletteRole;
    slot: number;
    hex: string | null;
  }) => {
    await updatePaletteSlot(args);
    onRefresh();
  };

  return (
    <>
      <AccordionCard
        title={
          <span className="flex items-center gap-2">
            <PaletteIcon size={18} />
            Color Palettes
          </span>
        }
      >
        {!entityId ? (
          <div className="text-sm text-brand-primary-2">
            Missing entity mapping for this entity.
          </div>
        ) : (
          <BrandPaletteGrid
            palettes={paletteMap}
            canEdit={canEdit}
            onUpdateSlot={handleUpdateSlot}
          />
        )}

        {entityId && !canEdit ? (
          <div className="mt-4 text-xs text-brand-secondary-0">
            You do not have permission to edit palettes.
          </div>
        ) : null}
      </AccordionCard>
    </>
  );
}
