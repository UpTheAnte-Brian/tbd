"use client";

import { useMemo, useState } from "react";
import type { AdminNonprofitReview } from "@/app/admin/nonprofits/types";

type Props = {
  narratives: AdminNonprofitReview["narratives"];
  latestReturn: AdminNonprofitReview["latest_return"];
};

const SECTION_LABELS: Record<string, string> = {
  part_iii: "Part III",
  schedule_o: "Schedule O",
  schedule_d: "Schedule D",
  schedule_a: "Schedule A",
  mission: "Mission",
  program_accomplishments: "Program Accomplishments",
  other: "Other",
};

const TRUNCATE_AT = 400;

export default function NarrativesCard({ narratives, latestReturn }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const map = new Map<string, AdminNonprofitReview["narratives"]>();
    narratives.forEach((row) => {
      const key = row.section || "other";
      const existing = map.get(key) ?? [];
      existing.push(row);
      map.set(key, existing);
    });
    return Array.from(map.entries());
  }, [narratives]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-text-on-light">Narratives</h2>
      {!latestReturn ? (
        <p className="mt-3 text-sm text-brand-secondary-2">
          No return available.
        </p>
      ) : narratives.length === 0 ? (
        <p className="mt-3 text-sm text-brand-secondary-2">
          No narratives parsed for this return.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {grouped.map(([section, rows]) => (
            <div key={section} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-secondary-0">
                {SECTION_LABELS[section] ?? section}
              </h3>
              <div className="space-y-3">
                {rows.map((row) => {
                  const isExpanded = expanded[row.id] ?? false;
                  const shouldTruncate = row.raw_text.length > TRUNCATE_AT;
                  const text = isExpanded || !shouldTruncate
                    ? row.raw_text
                    : `${row.raw_text.slice(0, TRUNCATE_AT)}…`;
                  return (
                    <div
                      key={row.id}
                      className="rounded-md border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-on-light"
                    >
                      {row.label ? (
                        <div className="mb-1 text-xs font-semibold text-brand-secondary-0">
                          {row.label}
                        </div>
                      ) : null}
                      <div className="whitespace-pre-wrap">{text}</div>
                      {shouldTruncate ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((prev) => ({
                              ...prev,
                              [row.id]: !isExpanded,
                            }))
                          }
                          className="mt-2 text-xs font-semibold text-brand-primary transition hover:text-brand-primary/80"
                        >
                          {isExpanded ? "Show less" : "Show more"}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
