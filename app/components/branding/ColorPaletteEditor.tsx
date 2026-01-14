"use client";

import { useEffect, useState } from "react";

export type ColorPalette = {
  id?: string;
  name: string;
  colors: string[];
  role?: string;
};

type Props = {
  initial: ColorPalette;
  entityName: string;
  fixedRole?: string;
  slotCount?: number;
  onSave: (palette: ColorPalette) => Promise<void>;
  onCancel: () => void;
};

const formatRoleLabel = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "primary") return "Primary";
  if (normalized === "secondary") return "Secondary";
  if (normalized === "tertiary") return "Tertiary";
  if (normalized === "accent") return "Accent";
  return value.trim();
};

export default function ColorPaletteEditor({
  initial,
  entityName,
  fixedRole,
  slotCount,
  onSave,
  onCancel,
}: Props) {
  const [colors, setColors] = useState<string[]>(initial.colors || []);
  const [role, setRole] = useState(fixedRole ?? initial.role ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const isFixedRole = Boolean(fixedRole);
  const isFixedSlots = typeof slotCount === "number";
  const resolvedRole = (fixedRole ?? role).trim();
  const roleLabel = resolvedRole ? formatRoleLabel(resolvedRole) : "";
  const namePrefix = entityName?.trim() || "Palette";
  const paletteName = resolvedRole
    ? `${namePrefix} ${roleLabel}`.trim()
    : "";
  const title = paletteName
    ? `${paletteName} Colors`
    : initial.id
      ? "Edit Color Palette"
      : "Create Color Palette";
  const showPrimaryGuidance = resolvedRole === "primary" && isFixedSlots;

  useEffect(() => {
    if (fixedRole) {
      setRole(fixedRole);
    }
  }, [fixedRole]);

  const isValidHex = (value: string) =>
    /^#([0-9A-Fa-f]{6})$/.test(value.trim());

  const updateColor = (index: number, value: string) => {
    const candidate = value.trim();
    setColors((prev) =>
      prev.map((c, i) => (i === index ? candidate : c)),
    );
    // Only show error when attempting to persist invalid hex
    if (!isValidHex(candidate)) {
      setError("Color must be a valid hex value like #RRGGBB");
    } else {
      setError(null);
    }
  };

  const handleSave = async () => {
    if (!resolvedRole.trim()) {
      setError("Role is required.");
      return;
    }
    // validate all colors before save
    const invalidColor = colors.find((c) => !isValidHex(c));
    if (invalidColor) {
      setError("All colors must be valid hex values like #RRGGBB");
      return;
    }

    const nameToSave = `${namePrefix} ${formatRoleLabel(resolvedRole)}`.trim();

    setSaving(true);
    setError(null);

    try {
      const colorsToSave = isFixedSlots
        ? colors.slice(0, slotCount ?? colors.length)
        : colors;
      await onSave({
        id: initial.id,
        name: nameToSave,
        colors: colorsToSave,
        role: resolvedRole,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save palette");
      }
    } finally {
      setSaving(false);
    }
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= colors.length || to >= colors.length) return;
    setColors((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    reorder(dragIndex, index);
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  return (
    <div className="flex max-w-lg flex-col gap-4 rounded-lg border border-brand-secondary-1 bg-brand-secondary-2 p-4 text-brand-secondary-0">
      <h2 className="text-xl font-semibold text-brand-secondary-0">{title}</h2>

      {error && <div className="text-sm text-brand-primary-2">{error}</div>}

      <div className="flex flex-col gap-2">
        {isFixedRole ? (
          <div className="rounded border border-brand-secondary-1 bg-brand-secondary-2 px-3 py-2 text-sm text-brand-secondary-0">
            Role:{" "}
            <span className="font-semibold">
              {roleLabel || resolvedRole}
            </span>
          </div>
        ) : (
          <select
            className="rounded border border-brand-secondary-1 bg-brand-secondary-2 px-3 py-2 text-brand-secondary-0"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            aria-label="Palette role"
          >
            <option value="">Select a role</option>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="tertiary">Tertiary</option>
            <option value="accent">Accent</option>
          </select>
        )}
        <div className="text-xs text-brand-secondary-0 opacity-70">
          Palette name will be:{" "}
          <span className="font-semibold text-brand-secondary-0">
            {paletteName || "Select a role to generate the name"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-widest text-brand-secondary-0">
          Colors
        </label>

        {showPrimaryGuidance ? (
          <div className="grid gap-2 text-xs text-brand-secondary-0 opacity-70 sm:grid-cols-2">
            <div>Up to 2 Dark Primary Colors</div>
            <div>One white or light Color</div>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          {colors.map((c, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded border border-brand-secondary-1 bg-brand-secondary-2 px-3 py-2 ${
                dragIndex === i ? "ring-2 ring-brand-primary-1" : ""
              }`}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
            >
              <input
                type="color"
                value={isValidHex(c) ? c : "#000000"}
                onChange={(e) => updateColor(i, e.target.value)}
                className="h-8 w-8 rounded border border-brand-secondary-1 bg-brand-secondary-2"
              />
              <input
                type="text"
                value={c}
                onChange={(e) => updateColor(i, e.target.value)}
                className="w-28 rounded border border-brand-secondary-1 bg-brand-secondary-2 px-2 py-1 text-brand-secondary-0"
                placeholder="#RRGGBB"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-brand-primary-0 px-4 py-2 text-brand-secondary-2 hover:bg-brand-primary-2 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>

        <button
          onClick={onCancel}
          className="rounded border border-brand-secondary-1 bg-brand-secondary-2 px-4 py-2 text-brand-secondary-0 hover:bg-brand-secondary-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
