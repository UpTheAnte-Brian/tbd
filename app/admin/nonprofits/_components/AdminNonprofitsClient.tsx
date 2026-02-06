"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { OnboardingQueueRow } from "@/app/admin/nonprofits/types";

export default function AdminNonprofitsClient() {
  const [rows, setRows] = useState<OnboardingQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingEin, setActivatingEin] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/nonprofits", {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to load onboarding queue");
      }
      const payload = (await response.json()) as OnboardingQueueRow[];
      setRows(payload ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load onboarding queue",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleActivate = async (row: OnboardingQueueRow) => {
    if (!row.ein || !row.district_entity_id) return;
    setActivatingEin(row.ein);
    setError(null);
    try {
      const response = await fetch(
        `/api/districts/${encodeURIComponent(row.district_entity_id)}/scope-nonprofits/activate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eins: [row.ein] }),
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to activate nonprofit");
      }
      await fetchQueue();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to activate nonprofit",
      );
    } finally {
      setActivatingEin(null);
    }
  };

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-text-on-light">
          Scope Queue (Exceptions)
        </h1>
        <p className="text-sm text-brand-secondary-0">
          In-scope nonprofits showing data gaps and activation status.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-border-subtle bg-surface-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h2 className="text-sm font-semibold text-text-on-light">
            Queue ({rows.length})
          </h2>
          <span className="text-xs text-brand-secondary-0">
            {loading ? "Loading…" : "In scope"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-inset text-xs uppercase tracking-wide text-brand-secondary-0">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">EIN</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Signals</th>
                <th className="px-4 py-3">Next step</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((row, index) => {
                const ein = row.ein ?? "";
                const canLink = Boolean(ein);
                const detailHref = canLink
                  ? `/admin/nonprofits/${encodeURIComponent(ein)}`
                  : "#";
                const isActivating = activatingEin === row.ein;

                const nextAction = !row.has_irs_org
                  ? "Investigate EIN"
                  : !row.has_returns
                    ? "Import returns"
                    : !row.has_entity
                      ? "Activate nonprofit"
                      : "Open profile";
                return (
                  <tr
                    key={`${row.district_entity_id ?? "district"}-${row.ein ?? row.label ?? "row"}-${index}`}
                    className="hover:bg-surface-inset/50"
                  >
                    <td className="px-4 py-3 font-medium text-text-on-light">
                      {row.label ?? row.ein ?? "Untitled"}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-on-light">
                      {row.ein ?? "--"}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-on-light">
                      {row.status ?? "--"}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-on-light">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-surface-inset px-2 py-1">
                          Entity: {row.has_entity ? "Yes" : "No"}
                        </span>
                        <span className="rounded-full bg-surface-inset px-2 py-1">
                          IRS org: {row.has_irs_org ? "Yes" : "No"}
                        </span>
                        <span className="rounded-full bg-surface-inset px-2 py-1">
                          Returns: {row.has_returns ? "Yes" : "No"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {!row.has_irs_org ||
                        !row.has_returns ||
                        row.has_entity ? (
                          <Link
                            href={detailHref}
                            className={`rounded-md bg-brand-primary-0 px-3 py-1 text-xs font-semibold text-brand-primary-1 transition hover:bg-brand-primary-2 ${
                              canLink ? "" : "pointer-events-none opacity-60"
                            }`}
                          >
                            {nextAction}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivate(row)}
                            disabled={isActivating}
                            className="rounded-md bg-brand-primary-0 px-3 py-1 text-xs font-semibold text-brand-primary-1 transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isActivating ? "Activating…" : nextAction}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-brand-secondary-0"
                  >
                    No scoped nonprofits in the queue.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
