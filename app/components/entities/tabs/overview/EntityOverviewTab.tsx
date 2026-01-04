"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import DistrictOverview from "@/app/components/districts/panels/overview";
import BusinessOverview from "@/app/components/businesses/overview";
import NonprofitOverview, {
  type NonprofitOverviewData,
} from "@/app/components/nonprofits/overview";
import type { Business, DistrictDetails, EntityType } from "@/app/lib/types/types";

type Props = {
  entityId: string;
  entityType: EntityType;
  entityName: string;
};

export default function EntityOverviewTab({
  entityId,
  entityType,
  entityName,
}: Props) {
  const [district, setDistrict] = useState<DistrictDetails | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [nonprofit, setNonprofit] = useState<NonprofitOverviewData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      setDistrict(null);
      setBusiness(null);
      setNonprofit(null);

      try {
        if (entityType === "district") {
          const res = await fetch(`/api/districts/${entityId}`, {
            cache: "no-store",
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "Failed to load district");
          }
          const json = (await res.json()) as DistrictDetails;
          if (!cancelled) setDistrict(json);
        } else if (entityType === "business") {
          const res = await fetch(`/api/businesses/${entityId}`, {
            cache: "no-store",
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "Failed to load business");
          }
          const json = (await res.json()) as Business;
          if (!cancelled) setBusiness(json);
        } else if (entityType === "nonprofit") {
          const res = await fetch(`/api/nonprofits/${entityId}`, {
            cache: "no-store",
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "Failed to load nonprofit");
          }
          const json = (await res.json()) as NonprofitOverviewData;
          if (!cancelled) setNonprofit(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [entityId, entityType]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-brand-primary-2">{error}</div>;
  }

  if (entityType === "district" && district) {
    return <DistrictOverview district={district} />;
  }

  if (entityType === "business" && business) {
    return <BusinessOverview business={business} />;
  }

  if (entityType === "nonprofit" && nonprofit) {
    return <NonprofitOverview nonprofit={nonprofit} />;
  }

  return (
    <div className="text-sm text-brand-secondary-0 opacity-70">
      Overview not available for {entityName}.
    </div>
  );
}
