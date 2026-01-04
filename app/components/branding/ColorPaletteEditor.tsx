"use client";

import { useState } from "react";

export type ColorPalette = {
  id?: string;
  name: string;
  colors: string[];
  role?: string;
};

type Props = {
  initial: ColorPalette;
  entityName: string;
  onSave: (palette: ColorPalette) => Promise<void>;
  onCancel: () => void;
};

export default function ColorPaletteEditor({
  initial,
  entityName,
  onSave,
  onCancel,
}: Props) {
  const [colors, setColors] = useState<string[]>(initial.colors || []);
  const [newColor, setNewColor] = useState("#000000");
  const [role, setRole] = useState(initial.role || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const isValidHex = (value: string) =>
    /^#([0-9A-Fa-f]{6})$/.test(value.trim());

  const addColor = () => {
    if (!newColor || !isValidHex(newColor)) {
      setError("Color must be a valid hex value like #RRGGBB");
      return;
    }
    setColors((prev) => [...prev, newColor]);
    setNewColor("#000000");
    setError(null);
  };

  const removeColor = (index: number) => {
    setColors((prev) => prev.filter((_, i) => i !== index));
  };

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
    if (!role.trim()) {
      setError("Role is required.");
      return;
    }
    // validate all colors before save
    const invalidColor = colors.find((c) => !isValidHex(c));
    if (invalidColor) {
      setError("All colors must be valid hex values like #RRGGBB");
      return;
    }

    const cleanShortname = entityName?.trim() || "Palette";
    const roleLabel =
      role === "primary"
        ? "Primary"
        : role === "secondary"
          ? "Secondary"
          : role === "tertiary"
            ? "Tertiary"
            : role === "accent"
              ? "Accent"
              : role;
    const nameToSave = `${cleanShortname} ${roleLabel}`.trim();

    setSaving(true);
    setError(null);

    try {
      await onSave({ id: initial.id, name: nameToSave, colors, role });
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
      <h2 className="text-xl font-semibold text-brand-secondary-0">
        {initial.id ? "Edit Color Palette" : "Create Color Palette"}
      </h2>

      {error && <div className="text-sm text-brand-primary-2">{error}</div>}

      <div className="flex flex-col gap-2">
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
        <div className="text-xs text-brand-secondary-0 opacity-70">
          Palette name will be:{" "}
          <span className="font-semibold text-brand-secondary-0">
            {role
              ? `${entityName} ${
                  {
                    primary: "Primary",
                    secondary: "Secondary",
                    tertiary: "Tertiary",
                    accent: "Accent",
                  }[role] ?? role
                }`
              : "Select a role to generate the name"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-medium text-brand-secondary-0">Colors</label>

        <div className="flex flex-wrap gap-2">
          {colors.map((c, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded border border-brand-secondary-1 bg-brand-secondary-2 px-2 py-1 ${
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
              <button
                onClick={() => removeColor(i)}
                className="text-xs text-brand-primary-2 hover:underline"
              >
                remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-10 w-10 rounded border border-brand-secondary-1 bg-brand-secondary-2"
          />
          <input
            type="text"
            className="w-32 rounded border border-brand-secondary-1 bg-brand-secondary-2 px-2 py-1 text-brand-secondary-0"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
          />
          <button
            onClick={addColor}
            className="rounded bg-brand-secondary-0 px-3 py-2 text-brand-secondary-2 hover:bg-brand-secondary-1"
          >
            Add Color
          </button>
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
