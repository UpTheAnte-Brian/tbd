"use client";

import { useMemo, useState } from "react";
import { Palette as PaletteIcon } from "lucide-react";
import AccordionCard from "@/app/components/user/AccordionCard";
import ColorPaletteEditor, {
  type ColorPalette,
} from "@/app/components/branding/ColorPaletteEditor";
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
  const [editingPalette, setEditingPalette] = useState<ColorPalette | null>(
    null
  );

  const colorColumns = useMemo(() => {
    if (!palettes?.length) return 0;
    return Math.max(0, ...palettes.map((p) => p.colors?.length ?? 0));
  }, [palettes]);
  const paletteGridTemplate = `minmax(220px, 2fr) 90px repeat(${colorColumns}, minmax(52px, 1fr))`;

  return (
    <>
      {editingPalette && entityId && (
        <div className="fixed inset-0 z-50 flex justify-end items-center">
          <div
            className="absolute inset-0 bg-brand-primary-0"
            style={{ opacity: 0.8 }}
          />
          <div className="relative z-10 w-full max-w-md max-h-[calc(100vh-2rem)] bg-brand-primary-0 text-brand-primary-1 border border-brand-primary-1 shadow-xl p-4 overflow-y-auto rounded-lg mr-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingPalette.id ? "Edit Palette" : "Create Palette"}
              </h3>
              <button
                className="text-brand-primary-1 hover:text-brand-accent-1"
                onClick={() => setEditingPalette(null)}
              >
                x
              </button>
            </div>

            <ColorPaletteEditor
              initial={editingPalette}
              entityName={entityName}
              onCancel={() => setEditingPalette(null)}
              onSave={async (palette) => {
                if (!entityId) return;
                const method = palette.id ? "PATCH" : "POST";
                const url = palette.id
                  ? `/api/entities/${entityId}/branding/palettes/${palette.id}`
                  : `/api/entities/${entityId}/branding/palettes`;

                const res = await fetch(url, {
                  method,
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: palette.name,
                    role: palette.role,
                    colors: palette.colors,
                  }),
                });

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
          <div className="text-sm text-brand-accent-1">
            Missing entity mapping for this entity.
          </div>
        ) : palettes?.length ? (
          <div className="mt-2 overflow-x-auto rounded border border-brand-primary-1 bg-brand-secondary-0">
            <div className="grid gap-2 min-w-max text-sm text-brand-primary-1">
              <div
                className="grid items-center gap-3 px-2 py-2 text-xs uppercase tracking-wide border-b border-brand-primary-1 bg-brand-secondary-1"
                style={{ gridTemplateColumns: paletteGridTemplate }}
              >
                <div>Name</div>
                <div className="text-center">Edit</div>
                {Array.from({ length: colorColumns }).map((_, idx) => (
                  <div
                    key={`header-${idx}`}
                    className="text-center text-xs uppercase tracking-wide"
                  >
                    {idx}
                  </div>
                ))}
              </div>

              {palettes.map((palette) => (
                <div
                  key={palette.id}
                  className="grid items-center gap-3 px-2 py-2 border-b border-brand-primary-1"
                  style={{ gridTemplateColumns: paletteGridTemplate }}
                >
                  <div className="flex items-center">
                    <h3 className="text-md font-medium text-brand-primary-1">
                      {palette.name}
                    </h3>
                  </div>
                  <div className="flex justify-center">
                    <button
                      className="px-3 py-1 rounded bg-brand-accent-1 text-brand-primary-1 text-xs hover:bg-brand-accent-2 disabled:opacity-50"
                      onClick={() =>
                        setEditingPalette({
                          id: palette.id,
                          name: palette.name,
                          colors: palette.colors,
                          role: palette.role,
                        })
                      }
                      disabled={!canEdit}
                    >
                      Edit
                    </button>
                  </div>
                  {Array.from({ length: colorColumns }).map((_, idx) => {
                    const color = palette.colors[idx];
                    return (
                      <div
                        key={`${palette.id}-color-${idx}`}
                        className="flex items-center justify-center"
                      >
                        {color ? (
                          <div
                            className="w-12 h-12 rounded border border-brand-primary-1 shadow-sm"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded border border-dashed border-brand-primary-1 flex items-center justify-center text-xs text-brand-primary-1">
                            -
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-brand-primary-1">
            No color palettes defined.
          </div>
        )}

        {entityId &&
          (canEdit ? (
            <button
              className="mt-4 px-3 py-2 bg-brand-accent-1 text-brand-primary-1 rounded hover:bg-brand-accent-2"
              onClick={() =>
                setEditingPalette({
                  id: undefined,
                  name: "",
                  colors: [],
                  role: undefined,
                })
              }
            >
              + Add Palette
            </button>
          ) : (
            <div className="mt-4 text-xs text-brand-primary-1">
              You do not have permission to edit palettes.
            </div>
          ))}
      </AccordionCard>
    </>
  );
}
