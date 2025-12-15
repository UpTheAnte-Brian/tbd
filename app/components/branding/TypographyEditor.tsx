"use client";

import { useEffect, useState } from "react";
import { BrandingTypography } from "@/app/lib/types/types";

const ROLE_LABELS: Record<string, string> = {
  header1: "Header One",
  header2: "Header Two",
  subheader: "Subheader",
  body: "Body / Paragraph",
  display: "Display / Accent",
  logo: "Logo (reference)",
};
const WEIGHT_OPTIONS = [
  "Light",
  "Regular",
  "Medium",
  "Semibold",
  "Bold",
  "ExtraBold",
  "Black",
] as const;
type FontAvailability = "system" | "google" | "licensed";
type FontForm = {
  font_name: string;
  availability: FontAvailability;
  weights: string[];
  usage_rules: string;
};

interface Props {
  districtId: string;
  role: string;
  typography: BrandingTypography[];
  onSaved: () => void;
  onClose: () => void;
}

export default function TypographyEditor({
  districtId,
  role,
  typography,
  onSaved,
  onClose,
}: Props) {
  const [form, setForm] = useState<FontForm>({
    font_name: "",
    availability: "system",
    weights: [],
    usage_rules: "",
  });
  const [fontSaving, setFontSaving] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);

  useEffect(() => {
    const row = typography.find((t) => t.role === role);
    setForm({
      font_name: row?.font_name ?? "",
      availability: (row?.availability as FontAvailability) ?? "system",
      weights: Array.isArray(row?.weights) ? (row?.weights as string[]) : [],
      usage_rules: row?.usage_rules ?? "",
    });
  }, [typography, role]);

  const saveRole = async () => {
    setFontError(null);
    const trimmedName = form.font_name.trim();
    // Simple heuristic: must start with a letter/number and only contain
    // letters/numbers/spaces and common punctuation. Reject URLs or empty.
    const fontNameValid =
      trimmedName.length > 0 &&
      /^[A-Za-z0-9][A-Za-z0-9\s.'’_-]*$/.test(trimmedName) &&
      !trimmedName.includes("://") &&
      !trimmedName.includes("/");
    if (!fontNameValid) {
      setFontError("Enter a valid font family name (e.g. Figtree, Inter).");
      return;
    }
    setFontSaving(true);
    try {
      const res = await fetch(`/api/districts/${districtId}/branding/fonts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          font_name: trimmedName,
          availability: form.availability,
          weights: form.weights,
          usage_rules: form.usage_rules,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save font");
      }
      onSaved();
    } catch (err) {
      setFontError(err instanceof Error ? err.message : "Failed to save font");
    } finally {
      setFontSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-900">Typography</h3>
        <button
          onClick={onClose}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ✕ Close
        </button>
      </div>
      {fontError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {fontError}
        </div>
      )}
      <div className="space-y-4">
        <div className="border rounded bg-white p-3 shadow-sm text-slate-900">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-slate-900">
              {ROLE_LABELS[role] ?? role}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-800">
                Font family
              </label>
              <input
                value={form.font_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, font_name: e.target.value }))
                }
                className="border border-slate-300 rounded px-2 py-1 text-slate-900"
                placeholder="e.g. Figtree"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-800">
                Availability
              </span>
              <div className="flex gap-3 text-sm">
                {["system", "google", "licensed"].map((opt) => (
                  <label key={opt} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`availability-${role}`}
                      value={opt}
                      checked={form.availability === opt}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          availability: e.target.value as FontAvailability,
                        }))
                      }
                    />
                    <span className="capitalize">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-800">
                Allowed weights
              </span>
              <div className="flex flex-wrap gap-2 text-sm">
                {WEIGHT_OPTIONS.map((w) => (
                  <label
                    key={w}
                    className={`px-2 py-1 rounded border cursor-pointer ${
                      form.weights.includes(w)
                        ? "bg-blue-200 border-blue-900 text-blue-900"
                        : "bg-white border-slate-300 text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={form.weights.includes(w)}
                      onChange={() =>
                        setForm((prev) => {
                          const exists = prev.weights.includes(w);
                          const weights = exists
                            ? prev.weights.filter((x) => x !== w)
                            : [...prev.weights, w];
                          return { ...prev, weights };
                        })
                      }
                    />
                    {w}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-800">
                Usage rules
              </label>
              <textarea
                value={form.usage_rules}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    usage_rules: e.target.value,
                  }))
                }
                className="border border-slate-300 rounded px-2 py-1 text-slate-900"
                rows={3}
                placeholder="Guidance for where/how to use this font"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveRole}
                disabled={fontSaving}
                className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {fontSaving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  const row = typography.find((t) => t.role === role);
                  setForm({
                    font_name: row?.font_name ?? "",
                    availability:
                      (row?.availability as FontAvailability) ?? "system",
                    weights: Array.isArray(row?.weights)
                      ? (row?.weights as string[])
                      : [],
                    usage_rules: row?.usage_rules ?? "",
                  });
                }}
                className="px-3 py-2 rounded bg-gray-200 text-slate-800 hover:bg-gray-300"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
