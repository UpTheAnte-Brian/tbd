"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  OnboardingQueueRow,
  ScopeTier,
} from "@/app/admin/nonprofits/types";
import type { OrgType } from "@/app/lib/types/nonprofits";
import { stripPublicSchoolDistrictSuffix } from "@/app/lib/utils/districts";

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
const TIERS: ScopeTier[] = [
  "registry_only",
  "disclosure_grade",
  "institutional",
];

export default function AdminNonprofitsClient() {
  const router = useRouter();
  const [rows, setRows] = useState<OnboardingQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgTypeEdits, setOrgTypeEdits] = useState<Record<string, OrgType>>({});
  const [savingOrgType, setSavingOrgType] = useState<Set<string>>(new Set());
  const [savingStatus, setSavingStatus] = useState<Set<string>>(new Set());
  const [tierEdits, setTierEdits] = useState<Record<string, ScopeTier>>({});
  const [savingTier, setSavingTier] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [showActive, setShowActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/nonprofits${showArchived ? "?showArchived=1" : ""}`,
        {
          cache: "no-store",
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to load onboarding queue");
      }
      const payload = (await response.json()) as OnboardingQueueRow[];
      setRows(payload ?? []);
      const nextOrgTypes: Record<string, OrgType> = {};
      const nextTiers: Record<string, ScopeTier> = {};
      (payload ?? []).forEach((row) => {
        if (!row.district_entity_id || !row.ein) return;
        const key = `${row.district_entity_id}:${row.ein}`;
        if (row.org_type) {
          nextOrgTypes[key] = row.org_type;
        }
        if (row.tier) {
          nextTiers[key] = row.tier;
        }
      });
      setOrgTypeEdits(nextOrgTypes);
      setTierEdits(nextTiers);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load onboarding queue",
      );
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  const updateOrgType = async (row: OnboardingQueueRow, orgType: OrgType) => {
    if (!row.ein || !row.district_entity_id) return;
    const key = `${row.district_entity_id}:${row.ein}`;
    const previous = orgTypeEdits[key] ?? row.org_type ?? "external_charity";
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
        if (
          orgType === "district_foundation" &&
          (body?.error === "DISTRICT_FOUNDATION_CONFLICT" ||
            body?.code === "23505" ||
            String(body?.constraint ?? "").includes(
              "ssn_one_district_foundation_per_district",
            ))
        ) {
          const districtName =
            stripPublicSchoolDistrictSuffix(row.district_name) ??
            row.district_name ??
            "this district";
          throw new Error(
            `Another nonprofit is listed as the District Foundation. You must make that an external charity before changing this nonprofit to the district foundation for ${districtName}.`,
          );
        }
        throw new Error(
          body?.message ?? body?.error ?? "Failed to update org type",
        );
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

  const updateScopeStatus = async (
    row: OnboardingQueueRow,
    status: "candidate" | "active" | "archived",
  ) => {
    if (!row.ein || !row.district_entity_id) return;
    const key = `${row.district_entity_id}:${row.ein}`;
    const previous = row.status ?? "candidate";
    setSavingStatus((prev) => new Set(prev).add(key));
    setError(null);

    try {
      const response = await fetch("/api/admin/nonprofits/scope", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district_entity_id: row.district_entity_id,
          ein: row.ein,
          status,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to update status");
      }

      setRows((prev) =>
        prev
          .map((item) =>
            item.district_entity_id === row.district_entity_id &&
            item.ein === row.ein
              ? { ...item, status }
              : item,
          )
          .filter((item) => (showArchived ? true : item.status !== "archived")),
      );
    } catch (err) {
      setRows((prev) =>
        prev.map((item) =>
          item.district_entity_id === row.district_entity_id &&
          item.ein === row.ein
            ? { ...item, status: previous }
            : item,
        ),
      );
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSavingStatus((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const updateScopeTier = async (row: OnboardingQueueRow, tier: ScopeTier) => {
    if (!row.ein || !row.district_entity_id) return;
    const key = `${row.district_entity_id}:${row.ein}`;
    const previous = tierEdits[key] ?? row.tier ?? "registry_only";
    setTierEdits((prev) => ({ ...prev, [key]: tier }));
    setSavingTier((prev) => new Set(prev).add(key));
    setError(null);

    try {
      const response = await fetch("/api/admin/nonprofits/scope", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district_entity_id: row.district_entity_id,
          ein: row.ein,
          tier,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body?.message ?? body?.error ?? "Failed to update tier",
        );
      }

      setRows((prev) =>
        prev.map((item) =>
          item.district_entity_id === row.district_entity_id &&
          item.ein === row.ein
            ? { ...item, tier }
            : item,
        ),
      );
    } catch (err) {
      setTierEdits((prev) => ({ ...prev, [key]: previous }));
      setError(err instanceof Error ? err.message : "Failed to update tier");
    } finally {
      setSavingTier((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const districtOptions = Array.from(
    rows.reduce((map, row) => {
      if (!row.district_entity_id) return map;
      const label =
        stripPublicSchoolDistrictSuffix(row.district_name) ??
        row.district_name ??
        "Unknown district";
      if (!map.has(row.district_entity_id)) {
        map.set(row.district_entity_id, label);
      }
      return map;
    }, new Map<string, string>()),
  )
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const filteredRows = rows
    .filter((row) => {
      if (row.status === "archived" && !showArchived) return false;
      if (row.status === "active" && !showActive) return false;
      if (
        districtFilter !== "all" &&
        row.district_entity_id !== districtFilter
      ) {
        return false;
      }
      return true;
    })
    .filter((row) => {
      if (!searchQuery.trim()) return true;
      const haystack = [
        row.label,
        row.ein,
        row.district_name,
        row.org_type,
        row.status,
        row.tier,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchQuery.trim().toLowerCase());
    });

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-text-on-light">
            Scope Queue (Exceptions)
          </h1>
          <p className="text-sm text-brand-secondary-0">
            In-scope nonprofits showing data gaps and activation status.
          </p>
          <p className="text-xs text-brand-secondary-0">
            Need a pre-EIN shell? Create it manually and finish the IRS link
            later.
          </p>
        </div>
        <Link
          href="/admin/nonprofits/new"
          className="inline-flex items-center justify-center rounded-lg border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary/90"
        >
          Create nonprofit shell
        </Link>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-border-subtle bg-surface-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h2 className="text-sm font-semibold text-text-on-light">
            Queue ({filteredRows.length})
          </h2>
          <div className="flex flex-1 items-center justify-end gap-3 text-xs text-brand-secondary-0">
            <div className="min-w-[220px]">
              <select
                value={districtFilter}
                onChange={(event) => setDistrictFilter(event.target.value)}
                aria-label="Filter by district"
                className="w-full rounded-md border border-border-subtle bg-white px-3 py-1 text-xs text-text-on-light shadow-sm focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1/30"
              >
                <option value="all">All districts</option>
                {districtOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[220px]">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name, EIN, district…"
                className="w-full rounded-md border-2 border-brand-primary-1/70 bg-white px-3 py-1 text-xs text-brand-primary-1 placeholder:text-brand-primary-1 placeholder:opacity-100 shadow-sm focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1/30"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showActive}
                onChange={(event) => setShowActive(event.target.checked)}
                className="h-3 w-3 rounded border-border-subtle"
              />
              Show active
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
                className="h-3 w-3 rounded border-border-subtle"
              />
              Show archived
            </label>
            <span>{loading ? "Loading…" : "In scope"}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-inset text-xs uppercase tracking-wide text-brand-secondary-0">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">EIN</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Signals</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredRows.map((row, index) => {
                  const ein = row.ein ?? "";
                  const canLink = Boolean(ein);
                  const detailHref = canLink
                    ? `/admin/nonprofits/${encodeURIComponent(ein)}`
                    : "#";
                  const orgTypeKey =
                    row.district_entity_id && row.ein
                      ? `${row.district_entity_id}:${row.ein}`
                      : null;
                  const orgTypeValue = orgTypeKey
                    ? (orgTypeEdits[orgTypeKey] ??
                      row.org_type ??
                      "external_charity")
                    : (row.org_type ?? "external_charity");
                  const isOrgTypeSaving = orgTypeKey
                    ? savingOrgType.has(orgTypeKey)
                    : false;
                  const tierValue = orgTypeKey
                    ? (tierEdits[orgTypeKey] ?? row.tier ?? "registry_only")
                    : (row.tier ?? "registry_only");
                  const isTierSaving = orgTypeKey
                    ? savingTier.has(orgTypeKey)
                    : false;

                  const statusKey = orgTypeKey ?? "";
                  const isStatusSaving = statusKey
                    ? savingStatus.has(statusKey)
                    : false;
                  const needsReturns =
                    tierValue === "disclosure_grade" && !row.has_returns;
                  const returnTypeLabel =
                    row.latest_return_type && row.latest_return_type.trim()
                      ? row.latest_return_type
                      : null;
                  return (
                    <tr
                      key={`${row.district_entity_id ?? "district"}-${row.ein ?? row.label ?? "row"}-${index}`}
                      className={`hover:bg-surface-inset/50 ${
                        canLink ? "cursor-pointer" : ""
                      }`}
                      onClick={() => {
                        if (canLink) router.push(detailHref);
                      }}
                    >
                      <td className="px-4 py-3 font-medium text-text-on-light">
                        {row.label ?? row.ein ?? "Untitled"}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-on-light">
                        {stripPublicSchoolDistrictSuffix(row.district_name) ??
                          row.district_name ??
                          "--"}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-on-light">
                        {row.ein ?? "--"}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-on-light">
                        <div className="flex flex-col gap-2">
                          <select
                            value={orgTypeValue}
                            onChange={(event) => {
                              const next = event.target.value as OrgType;
                              void updateOrgType(row, next);
                            }}
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                            disabled={!orgTypeKey || isOrgTypeSaving}
                            className="w-full rounded-md border border-border-subtle bg-surface-card px-2 py-1 text-xs text-text-on-light"
                          >
                            {ORG_TYPE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {ORG_TYPE_LABELS[option]}
                              </option>
                            ))}
                          </select>
                          {isOrgTypeSaving ? (
                            <span className="text-[11px] text-brand-secondary-0">
                              Saving…
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-on-light">
                        <div className="flex flex-col gap-2">
                          <select
                            value={tierValue}
                            onChange={(event) => {
                              const next = event.target.value as ScopeTier;
                              void updateScopeTier(row, next);
                            }}
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                            disabled={!orgTypeKey || isTierSaving}
                            className="w-full rounded-md border border-border-subtle bg-surface-card px-2 py-1 text-xs text-text-on-light"
                          >
                            {TIERS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          {isTierSaving ? (
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
                          <span
                            className={`rounded-full px-2 py-1 ${
                              needsReturns
                                ? "border border-rose-200 bg-rose-50 text-rose-700"
                                : "bg-surface-inset"
                            }`}
                          >
                            Returns: {row.has_returns ? "Yes" : "No"}
                            {row.has_returns && returnTypeLabel
                              ? ` (${returnTypeLabel})`
                              : ""}
                          </span>
                          {needsReturns ? (
                            <span className="text-[11px] font-semibold text-rose-600">
                              Needs returns
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-text-on-light">
                        <div className="flex flex-col items-end gap-1">
                          <select
                            value={row.status ?? "candidate"}
                            onChange={(event) => {
                              const next = event.target.value as
                                | "candidate"
                                | "active"
                                | "archived";
                              void updateScopeStatus(row, next);
                            }}
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                            disabled={!orgTypeKey || isStatusSaving}
                            className="w-full min-w-[130px] rounded-md border border-border-subtle bg-surface-card px-2 py-1 text-xs text-text-on-light"
                          >
                            <option value="candidate">candidate</option>
                            <option value="active">active</option>
                            <option value="archived">archived</option>
                          </select>
                          {isStatusSaving ? (
                            <span className="text-[11px] text-brand-secondary-0">
                              Saving…
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!loading && filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-brand-secondary-0"
                  >
                    No scoped nonprofits match your search.
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
