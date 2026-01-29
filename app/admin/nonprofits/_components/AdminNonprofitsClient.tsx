"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { OnboardingQueueRow } from "@/app/admin/nonprofits/types";

const STEP_LABELS: Record<OnboardingQueueRow["next_step"], string> = {
  create_entity: "Start onboarding",
  identity: "Identity",
  link_irs: "Link IRS",
  ingest_irs: "Ingest IRS",
  verify: "Mark ready",
  unknown: "View",
};

export default function AdminNonprofitsClient() {
  const [rows, setRows] = useState<OnboardingQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingScopeId, setUpdatingScopeId] = useState<string | null>(null);

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

  const handleMarkReady = async (row: OnboardingQueueRow) => {
    if (!row.ein) return;
    setUpdatingScopeId(row.scope_id);
    setError(null);
    try {
      const response = await fetch("/api/admin/nonprofits/scope", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ein: row.ein, status: "active" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to mark ready");
      }
      await fetchQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark ready");
    } finally {
      setUpdatingScopeId(null);
    }
  };

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-text-on-light">
          Onboarding Queue
        </h1>
        <p className="text-sm text-brand-secondary-0">
          Scoped nonprofits that still need onboarding or verification.
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
            {loading ? "Loading…" : "Not ready"}
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
              {rows.map((row) => (
                <tr key={row.scope_id} className="hover:bg-surface-inset/50">
                  <td className="px-4 py-3 font-medium text-text-on-light">
                    {row.label ?? row.ein ?? "Untitled"}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-on-light">
                    {row.ein ?? "--"}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-on-light">
                    {row.status}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-on-light">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface-inset px-2 py-1">
                        Entity: {row.has_entity ? "Yes" : "No"}
                      </span>
                      <span className="rounded-full bg-surface-inset px-2 py-1">
                        IRS link: {row.has_irs_link ? "Yes" : "No"}
                      </span>
                      <span className="rounded-full bg-surface-inset px-2 py-1">
                        Returns: {row.has_returns ? "Yes" : "No"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {row.next_step === "verify" ? (
                        <button
                          type="button"
                          onClick={() => handleMarkReady(row)}
                          disabled={updatingScopeId === row.scope_id}
                          className="rounded-md bg-brand-primary-0 px-3 py-1 text-xs font-semibold text-brand-primary-1 transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingScopeId === row.scope_id
                            ? "Updating…"
                            : STEP_LABELS[row.next_step]}
                        </button>
                      ) : (
                        <Link
                          href={row.action_url}
                          className="rounded-md bg-brand-primary-0 px-3 py-1 text-xs font-semibold text-brand-primary-1 transition hover:bg-brand-primary-2"
                        >
                          {STEP_LABELS[row.next_step]}
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-brand-secondary-0"
                  >
                    No nonprofits waiting for onboarding.
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
