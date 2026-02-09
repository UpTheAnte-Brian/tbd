"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import EntityOverviewPanel, {
  type EntityOverviewData,
} from "@/app/components/entities/tabs/overview/EntityOverviewPanel";

type Props = {
  entityId: string;
};

export default function EntityOverviewTab({ entityId }: Props) {
  const [overview, setOverview] = useState<EntityOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchOverview = async () => {
      setLoading(true);
      setError(null);
      setOverview(null);

      try {
        const res = await fetch(`/api/entities/${entityId}/overview`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load entity overview");
        }
        const json = (await res.json()) as EntityOverviewData;
        if (!cancelled) setOverview(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error");
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

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-brand-primary-2">{error}</div>;
  }

  if (overview) {
    return <EntityOverviewPanel data={overview} />;
  }

  return (
    <div className="text-sm text-brand-secondary-0 opacity-70">
      Overview not available.
    </div>
  );
}
