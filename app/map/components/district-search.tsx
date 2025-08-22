"use client";
import { useState, useMemo } from "react";
import { DistrictWithFoundation } from "@/app/lib/types";
import { getLabel } from "@/app/lib/district/utils";

type Props = {
  features: DistrictWithFoundation[];
  onSelect: (id: string) => void;
  panToFeature?: (feature: DistrictWithFoundation) => void;
};

export default function DistrictSearch({
  features,
  onSelect,
  panToFeature,
}: Props) {
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as { id: string; label: string }[];
    return features
      .map((f) => {
        const id = f.id;
        const label =
          getLabel(f) ||
          (f.properties?.shortname as string) ||
          (f.properties?.prefname as string) ||
          "";
        return { id, label };
      })
      .filter((x) => x.id && x.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, features]);

  const handleSelect = (s: { id: string; label: string }) => {
    onSelect(s.id);
    const f = features.find((d) => d.id === s.id);
    if (f && panToFeature) panToFeature(f);
    setQuery("");
    setHighlightedIndex(-1);
  };

  return (
    <div className="absolute bottom-0 w-4/5 p-4 z-50">
      <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search districts…"
          className="w-full rounded border px-3 py-2 outline-none"
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
          <ul className="mt-2 max-h-60 overflow-y-auto divide-y">
            {suggestions.map((s, i) => (
              <li key={s.id}>
                <button
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 hover:text-black ${
                    i === highlightedIndex ? "bg-gray-200 hover:text-black" : ""
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
    </div>
  );
}
