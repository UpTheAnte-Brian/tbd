"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { OnboardingQueueRow } from "@/app/admin/nonprofits/types";
import type { OrgType } from "@/app/lib/types/nonprofits";

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  district_foundation: "District Foundation",
  up_the_ante: "Up the Ante",
  external_charity: "External Charity",
};

const ORG_TYPE_OPTIONS: OrgType[] = [
  "district_foundation",
  "up_the_ante",
  "external_charity",
];

export default function AdminNonprofitsClient() {
  const [rows, setRows] = useState<OnboardingQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingEin, setActivatingEin] = useState<string | null>(null);
  const [orgTypeEdits, setOrgTypeEdits] = useState<Record<string, OrgType>>(
    {},
  );
  const [savingOrgType, setSavingOrgType] = useState<Set<string>>(new Set());

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
      const nextOrgTypes: Record<string, OrgType> = {};
      (payload ?? []).forEach((row) => {
        if (!row.district_entity_id || !row.ein) return;
        const key = `${row.district_entity_id}:${row.ein}`;
        if (row.org_type) {
          nextOrgTypes[key] = row.org_type;
        }
      });
      setOrgTypeEdits(nextOrgTypes);
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

  const updateOrgType = async (row: OnboardingQueueRow, orgType: OrgType) => {
    if (!row.ein || !row.district_entity_id) return;
    const key = `${row.district_entity_id}:${row.ein}`;
    const previous = orgTypeEdits[key] ??
      row.org_type ??
      "external_charity";
    setOrgTypeEdits((prev) => ({ ...prev, [key]: orgType }));
    setSavingOrgType((prev) => new Set(prev).add(key));
    setError(null);

    try {
      const response = await fetch("/api/admin/nonprofits/scope", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district_entity_id: row.district_entity_id,
          ein: row.ein,
          org_type: orgType,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to update org type");
      }

      setRows((prev) =>
        prev.map((item) =>
          item.district_entity_id === row.district_entity_id &&
              item.ein === row.ein
            ? { ...item, org_type: orgType }
            : item,
        ),
      );
    } catch (err) {
      setOrgTypeEdits((prev) => ({ ...prev, [key]: previous }));
      setError(
        err instanceof Error ? err.message : "Failed to update org type",
      );
    } finally {
      setSavingOrgType((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

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
                <th className="px-4 py-3">Type</th>
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
                const orgTypeKey =
                  row.district_entity_id && row.ein
                    ? `${row.district_entity_id}:${row.ein}`
                    : null;
                const orgTypeValue = orgTypeKey
                  ? orgTypeEdits[orgTypeKey] ??
                    row.org_type ??
                    "external_charity"
                  : row.org_type ?? "external_charity";
                const isOrgTypeSaving = orgTypeKey
                  ? savingOrgType.has(orgTypeKey)
                  : false;

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
                      <div className="flex flex-col gap-2">
                        <select
                          value={orgTypeValue}
                          onChange={(event) => {
                            const next = event.target.value as OrgType;
                            void updateOrgType(row, next);
                          }}
                          disabled={!orgTypeKey || isOrgTypeSaving}
                          className="w-full rounded-md border border-border-subtle bg-surface-card px-2 py-1 text-xs text-text-on-light"
                        >
                          {ORG_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {ORG_TYPE_LABELS[option]}
                            </option>
                          ))}
                        </select>
                        {row.org_type !== "district_foundation" &&
                        orgTypeKey ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateOrgType(row, "district_foundation")
                            }
                            disabled={isOrgTypeSaving}
                            className="rounded-md border border-border-subtle px-2 py-1 text-[11px] font-semibold text-text-on-light transition hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Set as District Foundation
                          </button>
                        ) : null}
                        {isOrgTypeSaving ? (
                          <span className="text-[11px] text-brand-secondary-0">
                            Saving…
                          </span>
                        ) : null}
                      </div>
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
                    colSpan={6}
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
