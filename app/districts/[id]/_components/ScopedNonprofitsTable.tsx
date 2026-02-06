"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Database } from "@/database.types";
import type { ScopeStatus, ScopeTier } from "@/app/admin/nonprofits/types";
import SectionCard from "@/app/components/districts/superintendent/SectionCard";

const TIERS: ScopeTier[] = [
  "registry_only",
  "disclosure_grade",
  "institutional",
];
const STATUSES: ScopeStatus[] = ["candidate", "active", "archived"];

type ScopeRow =
  Database["public"]["Views"]["v_district_scope_nonprofits"]["Row"];

type EditState = {
  label: string;
  tier: ScopeTier | "";
  status: ScopeStatus | "";
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatMoney(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "--";
  return moneyFormatter.format(value);
}

function formatText(value: string | null | undefined): string {
  if (!value) return "--";
  return value;
}

function deriveEditState(row: ScopeRow): EditState {
  return {
    label: row.scope_label ?? "",
    tier: (row.tier as ScopeTier | null) ?? "",
    status: (row.status as ScopeStatus | null) ?? "",
  };
}

export default function ScopedNonprofitsTable({
  districtEntityId,
}: {
  districtEntityId: string;
}) {
  const [rows, setRows] = useState<ScopeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [activatingAll, setActivatingAll] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/districts/${encodeURIComponent(districtEntityId)}/scope-nonprofits`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to load scope nonprofits");
      }
      const data = (await res.json()) as ScopeRow[];
      setRows(data ?? []);
      const nextEdits: Record<string, EditState> = {};
      (data ?? []).forEach((row) => {
        if (!row.ein) return;
        nextEdits[row.ein] = deriveEditState(row);
      });
      setEdits(nextEdits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [districtEntityId]);

  useEffect(() => {
    if (!districtEntityId) return;
    loadRows();
  }, [districtEntityId, loadRows]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const nameA = (a.scope_label || a.irs_legal_name || "").toLowerCase();
      const nameB = (b.scope_label || b.irs_legal_name || "").toLowerCase();
      if (nameA === nameB) return 0;
      return nameA < nameB ? -1 : 1;
    });
  }, [rows]);

  const setEditValue = (
    ein: string,
    field: keyof EditState,
    value: string,
  ) => {
    setEdits((prev) => ({
      ...prev,
      [ein]: {
        ...(prev[ein] ?? { label: "", tier: "", status: "" }),
        [field]: value,
      } as EditState,
    }));
  };

  const saveRow = async (ein: string) => {
    const edit = edits[ein];
    if (!edit) return;
    setSaving((prev) => new Set(prev).add(ein));
    try {
      const res = await fetch(
        `/api/districts/${encodeURIComponent(districtEntityId)}/scope-nonprofits`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([
            {
              ein,
              label: edit.label,
              tier: edit.tier || undefined,
              status: edit.status || undefined,
            },
          ]),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to save scope row");
      }
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(ein);
        return next;
      });
    }
  };

  const activateAll = async () => {
    setActivatingAll(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/districts/${encodeURIComponent(districtEntityId)}/scope-nonprofits/activate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to activate nonprofits");
      }
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setActivatingAll(false);
    }
  };

  return (
    <SectionCard
      title="Scoped Nonprofits"
      subtitle="Edit scope rows and drill into district-only nonprofit detail."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={activateAll}
            disabled={activatingAll}
            className="rounded-md bg-brand-secondary-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-brand-primary-1 disabled:opacity-60"
          >
            {activatingAll ? "Activating…" : "Activate all"}
          </button>
          <button
            type="button"
            onClick={loadRows}
            className="rounded-md border border-border-subtle bg-brand-primary-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-on-light"
          >
            Refresh
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="rounded border border-dashed border-border-subtle p-4 text-sm text-text-on-light">
          Loading scoped nonprofits…
        </div>
      ) : null}
      {error ? (
        <div className="rounded border border-dashed border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-brand-secondary-1 text-brand-primary-1">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">EIN</th>
              <th className="px-3 py-2 text-left font-medium">Tier</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Latest Tax Year</th>
              <th className="px-3 py-2 text-left font-medium">Revenue</th>
              <th className="px-3 py-2 text-left font-medium">Recency</th>
              <th className="px-3 py-2 text-left font-medium">Entity</th>
              <th className="px-3 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-6 text-center text-sm text-text-on-light"
                >
                  No scoped nonprofits yet.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => {
                const ein = row.ein ?? "";
                const displayName =
                  row.scope_label || row.irs_legal_name || row.ein || "--";
                const edit = edits[ein] ?? deriveEditState(row);
                const isSaving = saving.has(ein);
                const recency =
                  row.filing_recency_days != null
                    ? `${row.filing_recency_days}d`
                    : "--";

                return (
                  <tr key={`${ein}-${row.district_entity_id ?? ""}`}>
                    <td className="px-3 py-2 font-medium text-text-on-light">
                      {displayName}
                    </td>
                    <td className="px-3 py-2 text-text-on-light">
                      {formatText(row.ein)}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={edit.tier}
                        onChange={(event) =>
                          setEditValue(ein, "tier", event.target.value)
                        }
                        className="w-full rounded-md border border-border-subtle bg-brand-primary-1 px-2 py-2 text-xs text-text-on-light"
                      >
                        <option value="">Select tier</option>
                        {TIERS.map((tier) => (
                          <option key={tier} value={tier}>
                            {tier}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={edit.status}
                        onChange={(event) =>
                          setEditValue(ein, "status", event.target.value)
                        }
                        className="w-full rounded-md border border-border-subtle bg-brand-primary-1 px-2 py-2 text-xs text-text-on-light"
                      >
                        <option value="">Select status</option>
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-text-on-light">
                      {row.latest_tax_year ?? "--"}
                    </td>
                    <td className="px-3 py-2 text-text-on-light">
                      {formatMoney(row.total_revenue)}
                    </td>
                    <td className="px-3 py-2 text-text-on-light">
                      {recency}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          row.has_entity
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {row.has_entity ? "Linked" : "Missing"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/districts/${districtEntityId}/nonprofits/${ein}`}
                          className="rounded-md border border-border-subtle bg-brand-primary-1 px-3 py-1 text-xs font-semibold text-text-on-light"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => saveRow(ein)}
                          disabled={isSaving}
                          className="rounded-md bg-brand-secondary-1 px-3 py-1 text-xs font-semibold text-brand-primary-1 disabled:opacity-60"
                        >
                          {isSaving ? "Saving" : "Save"}
                        </button>
                      </div>
                      <div className="mt-2">
                        <input
                          value={edit.label}
                          onChange={(event) =>
                            setEditValue(ein, "label", event.target.value)
                          }
                          placeholder="Optional label"
                          className="w-full rounded-md border border-border-subtle bg-brand-primary-1 px-2 py-1 text-xs text-text-on-light"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
