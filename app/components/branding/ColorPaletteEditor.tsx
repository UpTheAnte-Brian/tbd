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
  onSave: (palette: ColorPalette) => Promise<void>;
  onCancel: () => void;
};

export default function ColorPaletteEditor({
  initial,
  onSave,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial.name || "");
  const [colors, setColors] = useState<string[]>(initial.colors || []);
  const [newColor, setNewColor] = useState("#000000");
  const [role, setRole] = useState(initial.role || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addColor = () => {
    if (!newColor || !/^#([0-9A-Fa-f]{6})$/.test(newColor)) {
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

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Palette name is required.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      await onSave({ id: initial.id, name: name.trim(), colors, role });
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

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-white max-w-lg text-slate-900">
      <h2 className="text-xl font-semibold text-slate-900">
        {initial.id ? "Edit Color Palette" : "Create Color Palette"}
      </h2>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="flex flex-col gap-2">
        <label className="font-medium text-slate-800">Palette Name</label>
        <input
          className="border border-slate-300 rounded px-3 py-2 text-slate-900 placeholder:text-slate-500 bg-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Primary Colors"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-medium text-slate-800">Role</label>
        <select
          className="border border-slate-300 rounded px-3 py-2 text-slate-900 bg-white"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Select a role</option>
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="tertiary">Tertiary</option>
          <option value="accent">Accent</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-medium text-slate-800">Colors</label>

        <div className="flex flex-wrap gap-2">
          {colors.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-2 border border-slate-300 px-2 py-1 rounded bg-white"
            >
              <div className="w-6 h-6 rounded" style={{ backgroundColor: c }} />
              <span className="text-sm text-slate-900">{c}</span>
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
