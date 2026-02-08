"use client";

import { useEffect, useState } from "react";
import SuperintendentDashboard from "@/app/components/districts/superintendent/SuperintendentDashboard";
import ScopedNonprofitsTable from "@/app/districts/[id]/_components/ScopedNonprofitsTable";
import type {
  ScopeSummary,
  SuperintendentDashboardResponse,
} from "@/app/components/districts/superintendent/types";
import LeadershipSection from "@/app/components/districts/LeadershipSection";
import type { EntityType } from "@/domain/entities/types";

type Props = {
  entityId: string;
  entityType: EntityType;
};

const emptyDashboard: SuperintendentDashboardResponse = {
  nonprofits: [],
  detailsByEntityId: {},
};

export default function EntitySuperintendentTab({
  entityId,
  entityType,
}: Props) {
  const [data, setData] =
    useState<SuperintendentDashboardResponse>(emptyDashboard);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeSummary, setScopeSummary] = useState<ScopeSummary | null>(null);
  const [scopeLoading, setScopeLoading] = useState(false);

  useEffect(() => {
    if (entityType !== "district") return;

    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const dashboardResponse = await fetch(
          `/api/superintendent?districtEntityId=${encodeURIComponent(entityId)}`,
          { cache: "no-store" },
        );

        if (!dashboardResponse.ok) {
          const body = await dashboardResponse.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load superintendent data");
        }

        const json =
          (await dashboardResponse.json()) as SuperintendentDashboardResponse;
        console.log("Loaded superintendent dashboard data:", json);
        console.log("cancelled:", cancelled);
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error");
          setData(emptyDashboard);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const loadSummary = async () => {
      setScopeLoading(true);
      setScopeSummary(null);
      try {
        const summaryResponse = await fetch(
          `/api/superintendent/scope/summary?districtEntityId=${encodeURIComponent(entityId)}`,
          { cache: "no-store" },
        );

        let summary: ScopeSummary | null = null;
        if (summaryResponse.ok) {
          const raw = (await summaryResponse.json()) as Record<string, unknown>;

          const totalRevenueRaw =
            raw.total_revenue ?? raw.totalRevenue ?? raw.totalRevenueTotal ?? 0;
          const totalNetAssetsRaw =
            raw.total_net_assets ??
            raw.totalNetAssets ??
            raw.totalNetAssetsTotal ??
            0;

          const totalRevenue = Number(totalRevenueRaw ?? 0);
          const totalNetAssets = Number(totalNetAssetsRaw ?? 0);

          summary = {
            nonprofits_in_scope: Number(raw.nonprofits_in_scope ?? 0),
            nonprofits_active: Number(raw.nonprofits_active ?? 0),
            nonprofits_candidate: Number(raw.nonprofits_candidate ?? 0),
            total_revenue: Number.isFinite(totalRevenue) ? totalRevenue : 0,
            total_net_assets: Number.isFinite(totalNetAssets)
              ? totalNetAssets
              : 0,
          };
        } else {
          const body = await summaryResponse.json().catch(() => ({}));
          console.warn(
            "Failed to load scope summary:",
            body?.error ?? summaryResponse.statusText,
          );
        }

        if (!cancelled) {
          setScopeSummary(summary);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn(
            "Failed to load scope summary:",
            err instanceof Error ? err.message : err,
          );
          setScopeSummary(null);
        }
      } finally {
        if (!cancelled) {
          setScopeLoading(false);
        }
      }
    };

    loadDashboard();
    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [entityId, entityType]);

  if (entityType !== "district") {
    return (
      <div className="rounded border border-dashed border-brand-secondary-1 p-4 text-sm text-brand-secondary-0 opacity-70">
        Superintendent dashboard is only available for districts.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LeadershipSection entityId={entityId} />

      {loading ? (
        <div className="rounded border border-dashed border-brand-secondary-1 p-4 text-sm text-brand-secondary-0 opacity-70">
          Loading superintendent dashboard…
        </div>
      ) : (
        <SuperintendentDashboard
          rows={data.nonprofits}
          detailsByEntityId={data.detailsByEntityId}
          scopeSummary={scopeSummary}
          scopeLoading={scopeLoading}
          error={error}
        />
      )}

      <ScopedNonprofitsTable districtEntityId={entityId} />
    </div>
  );
}
