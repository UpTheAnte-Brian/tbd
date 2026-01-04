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
  entityId: string;
  role: string;
  typography: BrandingTypography[];
  onSaved: () => void;
  onClose: () => void;
}

export default function TypographyEditor({
  entityId,
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
      const res = await fetch(`/api/entities/${entityId}/branding/typography`, {
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
    <div className="space-y-4 p-4 text-brand-secondary-0">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-brand-secondary-0">
          Typography
        </h3>
        <button
          onClick={onClose}
          className="text-sm text-brand-secondary-0 opacity-70 hover:opacity-100"
        >
          ✕ Close
        </button>
      </div>
      {fontError && (
        <div className="rounded border border-brand-primary-2 px-3 py-2 text-sm text-brand-primary-2">
          {fontError}
        </div>
      )}
      <div className="space-y-4">
        <div className="rounded border border-brand-secondary-1 bg-brand-secondary-2 p-3 text-brand-secondary-0">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-brand-secondary-0">
              {ROLE_LABELS[role] ?? role}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-brand-secondary-0">
                Font family
              </label>
              <input
                value={form.font_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, font_name: e.target.value }))
                }
                className="rounded border border-brand-secondary-1 bg-brand-secondary-2 px-2 py-1 text-brand-secondary-0"
                placeholder="e.g. Figtree"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-brand-secondary-0">
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
              <span className="text-sm font-medium text-brand-secondary-0">
                Allowed weights
              </span>
              <div className="flex flex-wrap gap-2 text-sm">
                {WEIGHT_OPTIONS.map((w) => (
                  <label
                    key={w}
                    className={`px-2 py-1 rounded border cursor-pointer ${
                      form.weights.includes(w)
                        ? "bg-brand-primary-0 border-brand-primary-0 text-brand-secondary-2"
                        : "bg-brand-secondary-2 border-brand-secondary-1 text-brand-secondary-0"
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
              <label className="text-sm font-medium text-brand-secondary-0">
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
                className="rounded border border-brand-secondary-1 bg-brand-secondary-2 px-2 py-1 text-brand-secondary-0"
                rows={3}
                placeholder="Guidance for where/how to use this font"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveRole}
                disabled={fontSaving}
                className="rounded bg-brand-primary-0 px-3 py-2 text-brand-secondary-2 hover:bg-brand-primary-2 disabled:opacity-50"
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
                className="rounded border border-brand-secondary-1 bg-brand-secondary-2 px-3 py-2 text-brand-secondary-0 hover:bg-brand-secondary-1"
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
