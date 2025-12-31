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
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-white max-w-lg text-slate-900">
      <h2 className="text-xl font-semibold text-slate-900">
        {initial.id ? "Edit Color Palette" : "Create Color Palette"}
      </h2>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="flex flex-col gap-2">
        <select
          className="border border-slate-300 rounded px-3 py-2 text-slate-900 bg-white"
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
        <div className="text-xs text-slate-600">
          Palette name will be:{" "}
          <span className="font-semibold text-slate-800">
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
        <label className="font-medium text-slate-800">Colors</label>

        <div className="flex flex-wrap gap-2">
          {colors.map((c, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 border border-slate-300 px-2 py-1 rounded bg-white ${
                dragIndex === i ? "ring-2 ring-blue-300" : ""
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
                className="w-8 h-8 border border-slate-300 rounded bg-white"
              />
              <input
                type="text"
                value={c}
                onChange={(e) => updateColor(i, e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 w-28 text-slate-900 bg-white"
                placeholder="#RRGGBB"
              />
              <button
                onClick={() => removeColor(i)}
                className="text-xs text-red-600 hover:underline"
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
            className="w-10 h-10 border border-slate-300 rounded bg-white"
          />
          <input
            type="text"
            className="border border-slate-300 rounded px-2 py-1 w-32 text-slate-900 bg-white"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
          />
          <button
            onClick={addColor}
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Add Color
          </button>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>

        <button
          onClick={onCancel}
          className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
