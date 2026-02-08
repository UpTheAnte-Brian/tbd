"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type {
  AdminNonprofitReview as AdminNonprofitReviewDTO,
  AdminScopeRow,
  ScopeStatus,
  ScopeTier,
} from "@/app/admin/nonprofits/types";
import { useRouter } from "next/navigation";
import { formatEinDashed } from "@/domain/irs/ein";

const TIERS: ScopeTier[] = [
  "registry_only",
  "disclosure_grade",
  "institutional",
];
const STATUSES: ScopeStatus[] = ["candidate", "active", "archived"];

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }
  return moneyFormatter.format(value);
}

type Props = {
  ein: string;
};

export default function AdminNonprofitReview({ ein }: Props) {
  const [data, setData] = useState<AdminNonprofitReviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<ScopeTier>("registry_only");
  const [status, setStatus] = useState<ScopeStatus>("candidate");
  const [savingScope, setSavingScope] = useState(false);
  const [creatingEntity, setCreatingEntity] = useState(false);
  const router = useRouter();

  const syncScopeState = (scope: AdminScopeRow | null) => {
    setTier(scope?.tier ?? "registry_only");
    setStatus(scope?.status ?? "candidate");
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/nonprofits/${encodeURIComponent(ein)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error("Failed to load nonprofit review");
      }
      const payload = (await response.json()) as AdminNonprofitReviewDTO;
      setData(payload);
      syncScopeState(payload.scope ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load review");
    } finally {
      setLoading(false);
    }
  }, [ein]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleScopeSave = async () => {
    if (!data) return;
    setSavingScope(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/nonprofits/scope", {
        method: data.scope ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district_entity_id: data.scope?.district_entity_id ?? null,
          ein: data.ein,
          tier,
          status,
          label: data.organization?.legal_name ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save scope settings");
      }

      const scope = (await response.json()) as AdminScopeRow;
      setData((prev) => (prev ? { ...prev, scope } : prev));
      syncScopeState(scope);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save scope");
    } finally {
      setSavingScope(false);
    }
  };

  const handleCreateEntity = async () => {
    if (!data) return;
    if (!data.scope?.district_entity_id) {
      setError(
        "Add this nonprofit to scope and set a district before creating the entity.",
      );
      return;
    }
    setCreatingEntity(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/nonprofits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.organization?.legal_name ?? data.scope?.label ?? data.ein,
          org_type: data.scope?.org_type ?? "external_charity",
          district_entity_id: data.scope.district_entity_id,
          scope_id: data.scope_id ?? null,
          ein: data.ein,
          website_url: null,
          mission_statement: null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create entity");
      }

      type CreateNonprofitShellResponse =
        | {
            entity_id: string;
            nonprofit_id: string;
            slug?: string;
            scope_id?: string | null;
          }
        | {
            entity?: {
              id: string;
              slug?: string;
            } | null;
            scope?: AdminScopeRow | null;
            scope_id?: string | null;
          };

      const payload = (await response.json()) as CreateNonprofitShellResponse;
      const createdEntityId =
        "entity_id" in payload
          ? payload.entity_id
          : (payload.entity?.id ?? null);
      const scopeId =
        data.scope_id ??
        ("scope_id" in payload ? payload.scope_id ?? null : null) ??
        ("scope" in payload ? (payload.scope?.id ?? null) : null);

      if (createdEntityId) {
        const qs = new URLSearchParams();
        if (scopeId) qs.set("scope_id", scopeId);
        qs.set("ein", data.ein);

        router.push(
          `/admin/nonprofits/${encodeURIComponent(createdEntityId)}/onboarding?${qs.toString()}`,
        );
        return;
      }

      // Fallback (shouldn't happen): refresh the page state.
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create entity");
    } finally {
      setCreatingEntity(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-brand-secondary-2 shadow-sm">
        Loading nonprofit review...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-brand-secondary-2 shadow-sm">
        No data found.
      </div>
    );
  }

  const org = data.organization;

  // Canonical Entity derived values
  const linkedEntityId = data.entity?.id ?? data.scope?.entity_id ?? null;
  const linkedEntitySlug = data.entity?.slug ?? null;
  const linkedEntityName = data.entity?.name ?? null;

  const onboardingQs = new URLSearchParams();
  if (data.scope_id) onboardingQs.set("scope_id", data.scope_id);
  onboardingQs.set("ein", data.ein);
  const onboardingHref = linkedEntityId
    ? `/admin/nonprofits/${encodeURIComponent(linkedEntityId)}/onboarding?${onboardingQs.toString()}`
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-brand-secondary-2">
              IRS Organization
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-text-on-light">
              {org?.legal_name ?? "Unknown organization"}
            </h1>
            <p className="mt-2 text-sm text-brand-secondary-2">
              EIN {formatEinDashed(data.ein) ?? data.ein}
            </p>
            <p className="mt-1 text-sm text-brand-secondary-2">
              {[org?.city, org?.state].filter(Boolean).join(", ") ||
                "Location unavailable"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/nonprofits"
              className="rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-text-on-light transition hover:border-brand-primary hover:text-brand-primary"
            >
              Back to search
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-text-on-light">
            Latest Filing Snapshot
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-secondary-2">
                Latest tax year
              </p>
              <p className="mt-1 text-lg font-semibold text-text-on-light">
                {data.latest_return?.tax_year ?? "--"}
              </p>
              <p className="text-xs text-brand-secondary-2">
                {data.latest_return?.return_type ?? "Return type unknown"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-secondary-2">
                Filed on
              </p>
              <p className="mt-1 text-lg font-semibold text-text-on-light">
                {data.latest_return?.filed_on ?? "--"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-secondary-2">
                Total revenue
              </p>
              <p className="mt-1 text-lg font-semibold text-text-on-light">
                {formatMoney(data.latest_financials?.total_revenue)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-secondary-2">
                Net assets
              </p>
              <p className="mt-1 text-lg font-semibold text-text-on-light">
                {formatMoney(data.latest_financials?.net_assets_end)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-secondary-2">
                Total expenses
              </p>
              <p className="mt-1 text-lg font-semibold text-text-on-light">
                {formatMoney(data.latest_financials?.total_expenses)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-secondary-2">
                Total liabilities
              </p>
              <p className="mt-1 text-lg font-semibold text-text-on-light">
                {formatMoney(data.latest_financials?.total_liabilities_end)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-text-on-light">
            Data Health
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-brand-secondary-2">Narratives</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  data.narratives_count > 0
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {data.narratives_count > 0 ? "OK" : "Missing"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-brand-secondary-2">People parse</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  data.people_parse_quality === "good"
                    ? "bg-emerald-100 text-emerald-700"
                    : data.people_parse_quality === "mixed"
                      ? "bg-amber-100 text-amber-700"
                      : data.people_parse_quality === "poor"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                }`}
              >
                {data.people_parse_quality}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-brand-secondary-2">Filing recency</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  data.missing_filings
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {data.missing_filings ? "Missing" : "Recent"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-text-on-light">
            Scope Controls
          </h2>
          <p className="mt-1 text-xs text-brand-secondary-2">
            Select the tier and status for superintendent review.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-brand-secondary-2">
                Tier
              </label>
              <select
                value={tier}
                onChange={(event) => setTier(event.target.value as ScopeTier)}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
              >
                {TIERS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-brand-secondary-2">
                Status
              </label>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ScopeStatus)
                }
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
              >
                {STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleScopeSave}
              disabled={savingScope}
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingScope
                ? "Saving..."
                : data.scope
                  ? "Update scope"
                  : "Add to scope"}
            </button>
            {data.scope ? (
              <span className="text-xs text-brand-secondary-2">
                Current tier: {data.scope.tier} ({data.scope.status})
              </span>
            ) : (
              <span className="text-xs text-brand-secondary-2">
                Not currently in scope
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-text-on-light">
            Canonical Entity
          </h2>
          <p className="mt-1 text-xs text-brand-secondary-2">
            Create the nonprofit shell (public.entities + public.nonprofits) so
            onboarding steps can save identity fields.
          </p>
          <div className="mt-4 space-y-3">
            {linkedEntityId ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Linked entity:{" "}
                {linkedEntityName ? (
                  <>
                    {linkedEntityName}
                    {linkedEntitySlug ? ` (${linkedEntitySlug})` : ""}
                  </>
                ) : (
                  <span className="font-mono">{linkedEntityId}</span>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                No entity linked yet.
              </div>
            )}

            {linkedEntityId && onboardingHref ? (
              <Link
                href={onboardingHref}
                className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary/90"
              >
                Continue onboarding
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleCreateEntity}
                disabled={creatingEntity || Boolean(linkedEntityId)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-text-on-light shadow-sm transition hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {linkedEntityId
                  ? "Entity already linked"
                  : creatingEntity
                    ? "Creating..."
                    : "Create nonprofit shell"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
