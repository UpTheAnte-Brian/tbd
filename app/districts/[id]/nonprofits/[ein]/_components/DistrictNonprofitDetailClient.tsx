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

type IrsOrgRow = Database["irs"]["Tables"]["organizations"]["Row"];

type IrsReturnRow = Database["irs"]["Tables"]["returns"]["Row"];

type IrsFinancialRow =
  Database["irs"]["Tables"]["return_financials"]["Row"];

type DetailResponse = {
  scope: ScopeRow | null;
  organization: IrsOrgRow | null;
  latest_return: IrsReturnRow | null;
  latest_financials: IrsFinancialRow | null;
  health: {
    has_irs_org: boolean;
    has_returns: boolean;
    has_entity: boolean;
    filing_recency_days: number | null;
    people_parse_ok: boolean | null;
    narratives_ok: boolean | null;
  };
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

export default function DistrictNonprofitDetailClient({
  districtEntityId,
  ein,
}: {
  districtEntityId: string;
  ein: string;
}) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activationPending, setActivationPending] = useState(false);
  const [scopeEdit, setScopeEdit] = useState<{
    label: string;
    tier: ScopeTier | "";
    status: ScopeStatus | "";
  }>({ label: "", tier: "", status: "" });

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/districts/${encodeURIComponent(districtEntityId)}/nonprofits/${encodeURIComponent(ein)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to load nonprofit detail");
      }
      const payload = (await res.json()) as DetailResponse;
      setData(payload);
      const scope = payload.scope;
      setScopeEdit({
        label: scope?.scope_label ?? "",
        tier: (scope?.tier as ScopeTier | null) ?? "",
        status: (scope?.status as ScopeStatus | null) ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [districtEntityId, ein]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const displayName = useMemo(() => {
    return (
      data?.scope?.scope_label ||
      data?.organization?.legal_name ||
      data?.scope?.ein ||
      ein
    );
  }, [data, ein]);

  const location = useMemo(() => {
    const parts = [data?.organization?.city, data?.organization?.state].filter(
      Boolean,
    );
    return parts.length ? parts.join(", ") : "--";
  }, [data]);

  const saveScope = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/districts/${encodeURIComponent(districtEntityId)}/scope-nonprofits`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([
            {
              ein,
              label: scopeEdit.label,
              tier: scopeEdit.tier || undefined,
              status: scopeEdit.status || undefined,
            },
          ]),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to update scope");
      }
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const activate = async () => {
    setActivationPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/districts/${encodeURIComponent(districtEntityId)}/scope-nonprofits/activate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eins: [ein] }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to activate nonprofit");
      }
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setActivationPending(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded border border-dashed border-border-subtle p-4 text-sm text-text-on-light">
        Loading nonprofit detail…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-on-light">
            District Scoped Nonprofit
          </p>
          <h1 className="text-2xl font-semibold text-text-on-light">
            {displayName}
          </h1>
          <p className="text-sm text-text-on-light">
            EIN {formatText(data?.scope?.ein || ein)} · {location}
          </p>
        </div>
        <Link
          href={`/districts/${districtEntityId}?tab=superintendent`}
          className="rounded-md border border-border-subtle bg-brand-primary-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-on-light"
        >
          Back to Superintendent
        </Link>
      </div>

      {error ? (
        <div className="rounded border border-dashed border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <SectionCard title="Latest Filing Snapshot">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-text-on-light">Tax year</p>
            <p className="text-lg font-semibold text-text-on-light">
              {data?.latest_return?.tax_year ?? "--"}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-on-light">Return type</p>
            <p className="text-lg font-semibold text-text-on-light">
              {data?.latest_return?.return_type ?? "--"}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-on-light">Total revenue</p>
            <p className="text-lg font-semibold text-text-on-light">
              {formatMoney(data?.latest_financials?.total_revenue ?? null)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-on-light">Net assets</p>
            <p className="text-lg font-semibold text-text-on-light">
              {formatMoney(data?.latest_financials?.net_assets_end ?? null)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-on-light">Total expenses</p>
            <p className="text-lg font-semibold text-text-on-light">
              {formatMoney(data?.latest_financials?.total_expenses ?? null)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-on-light">Filing recency</p>
            <p className="text-lg font-semibold text-text-on-light">
              {data?.health?.filing_recency_days != null
                ? `${data.health.filing_recency_days}d`
                : "--"}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Data Health">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-border-subtle p-3">
            <p className="text-xs text-text-on-light">IRS Org</p>
            <p className="text-sm font-semibold text-text-on-light">
              {data?.health?.has_irs_org ? "Present" : "Missing"}
            </p>
          </div>
          <div className="rounded-md border border-border-subtle p-3">
            <p className="text-xs text-text-on-light">Returns</p>
            <p className="text-sm font-semibold text-text-on-light">
              {data?.health?.has_returns ? "Present" : "Missing"}
            </p>
          </div>
          <div className="rounded-md border border-border-subtle p-3">
            <p className="text-xs text-text-on-light">People Parse</p>
            <p className="text-sm font-semibold text-text-on-light">
              {data?.health?.people_parse_ok == null
                ? "Unknown"
                : data.health.people_parse_ok
                ? "OK"
                : "Needs review"}
            </p>
          </div>
          <div className="rounded-md border border-border-subtle p-3">
            <p className="text-xs text-text-on-light">Narratives</p>
            <p className="text-sm font-semibold text-text-on-light">
              {data?.health?.narratives_ok == null
                ? "Unknown"
                : data.health.narratives_ok
                ? "OK"
                : "Missing"}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Scope Controls"
        subtitle="Update tier, status, or label for this district's scope row."
        actions={
          <button
            type="button"
            onClick={saveScope}
            disabled={saving}
            className="rounded-md bg-brand-secondary-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-brand-primary-1 disabled:opacity-60"
          >
            {saving ? "Saving" : "Save"}
          </button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-text-on-light">
            Label
            <input
              value={scopeEdit.label}
              onChange={(event) =>
                setScopeEdit((prev) => ({
                  ...prev,
                  label: event.target.value,
                }))
              }
              placeholder="Optional label"
              className="mt-1 w-full rounded-md border border-border-subtle bg-brand-primary-1 px-3 py-2 text-sm text-text-on-light"
            />
          </label>
          <label className="text-sm text-text-on-light">
            Tier
            <select
              value={scopeEdit.tier}
              onChange={(event) =>
                setScopeEdit((prev) => ({
                  ...prev,
                  tier: event.target.value as ScopeTier,
                }))
              }
              className="mt-1 w-full rounded-md border border-border-subtle bg-brand-primary-1 px-3 py-2 text-sm text-text-on-light"
            >
              <option value="">Select tier</option>
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-text-on-light">
            Status
            <select
              value={scopeEdit.status}
              onChange={(event) =>
                setScopeEdit((prev) => ({
                  ...prev,
                  status: event.target.value as ScopeStatus,
                }))
              }
              className="mt-1 w-full rounded-md border border-border-subtle bg-brand-primary-1 px-3 py-2 text-sm text-text-on-light"
            >
              <option value="">Select status</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Activation">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-text-on-light">
              {data?.health?.has_entity
                ? "This nonprofit already has an entity record."
                : "Activate this nonprofit to create a public entity record."}
            </p>
            {data?.scope?.entity_id ? (
              <p className="text-xs text-text-on-light">
                Entity ID: {data.scope.entity_id}
              </p>
            ) : null}
          </div>
          {data?.health?.has_entity ? (
            <button
              type="button"
              disabled
              className="rounded-md border border-border-subtle bg-brand-primary-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-on-light opacity-60"
            >
              Activated
            </button>
          ) : (
            <button
              type="button"
              onClick={activate}
              disabled={activationPending}
              className="rounded-md bg-brand-secondary-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-brand-primary-1 disabled:opacity-60"
            >
              {activationPending ? "Activating" : "Activate nonprofit"}
            </button>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
