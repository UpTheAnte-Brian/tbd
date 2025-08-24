"use client";
import { useState, useMemo } from "react";
import { DistrictWithFoundation } from "@/app/lib/types";
import { getLabel } from "@/app/lib/district/utils";

type Props = {
  features: DistrictWithFoundation[];
  selectedIds: string[]; // 🔑 new
  onChange: (ids: string[]) => void; // 🔑 replaces onSelect
};

export default function DistrictMultiSelectSearch({
  features,
  selectedIds,
  onChange,
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

  const toggleSelect = (s: { id: string; label: string }) => {
    if (selectedIds.includes(s.id)) {
      onChange(selectedIds.filter((id) => id !== s.id));
    } else {
      onChange([...selectedIds, s.id]);
    }
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
                toggleSelect(suggestions[highlightedIndex]);
              }
            }
          }}
        />
        {query && suggestions.length > 0 && (
          <ul className="mt-2 max-h-60 overflow-y-auto divide-y">
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                className="flex items-center px-3 py-2 text-black hover:bg-gray-100"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(s.id)}
                  onChange={() => toggleSelect(s)}
                  className="flex-1 mr-2 w-2"
                />
                <span
                  className={` text-black cursor-pointer ${
                    i === highlightedIndex ? "bg-gray-200" : ""
                  }`}
                  onClick={() => toggleSelect(s)}
                >
                  {s.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
