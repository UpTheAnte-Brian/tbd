"use client";

import { useEffect, useState } from "react";
import SuperintendentDashboard from "@/app/components/districts/superintendent/SuperintendentDashboard";
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
  const [data, setData] = useState<SuperintendentDashboardResponse>(
    emptyDashboard,
  );
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
          summary = (await summaryResponse.json()) as ScopeSummary;
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
    </div>
  );
}
