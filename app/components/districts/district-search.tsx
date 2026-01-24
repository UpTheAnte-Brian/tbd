"use client";
import { useState, useMemo } from "react";
import { getLabel } from "@/app/lib/district/utils";

type SearchFeature = {
  id?: string | number | null;
  properties?: Record<string, unknown> | null;
};

type Props<T extends SearchFeature> = {
  features: T[];
  onSelect: (feature: T) => void;
};

export default function DistrictSearch<T extends SearchFeature>({
  features,
  onSelect,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as { id: string; label: string }[];
    return features
      .map((f) => {
        const id =
          typeof f.id === "string" || typeof f.id === "number"
            ? String(f.id)
            : "";
        const label =
          getLabel(f as { properties?: Record<string, unknown> | null }) || "";
        return { id, label };
      })
      .filter((x) => x.id && x.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, features]);

  const handleSelect = (s: { id: string; label: string }) => {
    const f = features.find((d) => String(d.id ?? "") === s.id);
    if (f) {
      onSelect(f);
    }
    setQuery("");
    setHighlightedIndex(-1);
  };

  return (
    <div className="rounded-lg border border-brand-secondary-0 bg-brand-secondary-1 p-2 shadow-lg">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search districts…"
        className="w-full rounded border border-brand-secondary-2 bg-brand-secondary-0 px-3 py-2 text-brand-primary-1 placeholder:text-brand-secondary-2 outline-none focus:border-brand-accent-1 focus:ring-1 focus:ring-brand-accent-1"
        type="text"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) =>
              Math.min(prev + 1, suggestions.length - 1)
            );
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (
              highlightedIndex >= 0 &&
              highlightedIndex < suggestions.length
            ) {
              handleSelect(suggestions[highlightedIndex]);
            }
          }
        }}
      />
      {query && suggestions.length > 0 && (
        <ul className="mt-2 max-h-60 overflow-y-auto divide-y divide-brand-secondary-0">
          {suggestions.map((s, i) => (
            <li key={s.id}>
              <button
                className={`w-full text-left px-3 py-2 text-brand-primary-1 hover:bg-brand-secondary-0 ${
                  i === highlightedIndex ? "bg-brand-secondary-0" : ""
                }`}
                onClick={() => handleSelect(s)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
