"use client";

import { useMemo, useState } from "react";
import { Palette as PaletteIcon } from "lucide-react";
import AccordionCard from "@/app/components/user/AccordionCard";
import BrandPaletteGrid from "@/app/components/branding/BrandPaletteGrid";
import ColorPaletteEditor, {
  type ColorPalette,
} from "@/app/components/branding/ColorPaletteEditor";
import {
  toPaletteMap,
  type CanonicalPalette,
  type CanonicalPalettes,
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
  const [editingPalette, setEditingPalette] = useState<CanonicalPalette | null>(
    null
  );

  const paletteMap = useMemo<CanonicalPalettes>(
    () => toPaletteMap(palettes, entityName),
    [palettes, entityName]
  );

  return (
    <>
      {editingPalette && entityId && (
        <div className="fixed inset-0 z-50 flex justify-end items-center">
          <div
            className="absolute inset-0 bg-brand-secondary-0"
            style={{ opacity: 0.8 }}
          />
          <div className="relative z-10 w-full max-w-md max-h-[calc(100vh-2rem)] bg-brand-secondary-2 text-brand-secondary-0 border border-brand-secondary-1 shadow-xl p-4 overflow-y-auto rounded-lg mr-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingPalette.id ? "Edit Palette" : "Initialize Palette"}
              </h3>
              <button
                className="text-brand-secondary-0 hover:text-brand-primary-2"
                onClick={() => setEditingPalette(null)}
              >
                x
              </button>
            </div>

            <ColorPaletteEditor
              initial={editingPalette as ColorPalette}
              entityName={entityName}
              fixedRole={editingPalette.role}
              slotCount={3}
              onCancel={() => setEditingPalette(null)}
              onSave={async (palette) => {
                if (!entityId) return;
                const res = await fetch(
                  `/api/entities/${entityId}/branding/palettes`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: palette.name,
                      role: palette.role,
                      colors: palette.colors,
                    }),
                  }
                );

                if (!res.ok) {
                  const err = await res.json().catch(() => null);
                  throw new Error(err?.error || "Failed to save palette");
                }

                setEditingPalette(null);
                onRefresh();
              }}
            />
          </div>
        </div>
      )}

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
            onEditPalette={(palette) => setEditingPalette(palette)}
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
