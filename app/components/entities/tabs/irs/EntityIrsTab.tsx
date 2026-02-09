"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";

type IrsOverviewEntry = {
  ein: string;
  latest_tax_year: number | null;
  latest_return_type: string | null;
  returns_count: number;
};

type IrsOverviewResponse = {
  eins: string[];
  summary: IrsOverviewEntry[];
};

type Props = {
  entityId: string;
};

function formatEin(ein: string) {
  if (ein.length === 9) {
    return `${ein.slice(0, 2)}-${ein.slice(2)}`;
  }
  return ein;
}

export default function EntityIrsTab({ entityId }: Props) {
  const [data, setData] = useState<IrsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchOverview = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/entities/${entityId}/irs/overview`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load IRS overview");
        }
        const json = (await res.json()) as IrsOverviewResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOverview();
    return () => {
      cancelled = true;
    };
  }, [entityId]);

  const summary = useMemo(() => data?.summary ?? [], [data?.summary]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-brand-primary-2">{error}</div>;
  }

  if (!summary.length) {
    return (
      <div className="rounded border border-dashed border-brand-secondary-1 bg-brand-secondary-2 p-6 text-sm text-brand-secondary-0">
        No IRS records are linked to this entity yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-brand-secondary-0 opacity-70">
        Linked EINs: {summary.length}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {summary.map((row) => (
          <div
            key={row.ein}
            className="rounded-lg border border-brand-secondary-1 bg-brand-secondary-2 p-5 text-brand-secondary-0"
          >
            <div className="text-sm uppercase tracking-wide opacity-60">
              EIN
            </div>
            <div className="text-lg font-semibold">{formatEin(row.ein)}</div>
            <div className="mt-3 text-sm">
              <div>
                <span className="opacity-60">Latest return:</span>{" "}
                {row.latest_tax_year ?? "—"}{" "}
                {row.latest_return_type ? `(${row.latest_return_type})` : ""}
              </div>
              <div>
                <span className="opacity-60">Return count:</span>{" "}
                {row.returns_count}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
