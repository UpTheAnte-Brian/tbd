"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import EntityPanelTabs from "@/app/components/entities/panels/EntityPanelTabs";
import EntityPanelContent from "@/app/components/entities/panels/EntityPanelContent";
import EntityPageLayout from "@/app/components/entities/EntityPageLayout";
import { EntityLogo } from "@/app/components/branding/EntityLogo";
import {
  getEntityTabKeys,
  useEntityTabParam,
} from "@/app/components/entities/hooks/useEntityTabParam";
import type { EntityType } from "@/app/lib/types/types";

type EntityDetails = {
  id: string;
  entity_type: string | null;
  slug: string | null;
  name: string | null;
  active: boolean | null;
};

type Props = {
  entityId: string;
  entityType?: EntityType;
};

export default function EntityPanel({ entityId, entityType }: Props) {
  const [entity, setEntity] = useState<EntityDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchEntity = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/entities/${entityId}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load entity");
        }
        const data = (await res.json()) as EntityDetails;
        if (!cancelled) {
          setEntity(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error");
          setEntity(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEntity();
    return () => {
      cancelled = true;
    };
  }, [entityId]);

  const resolvedType = useMemo(() => {
    const knownTypes: EntityType[] = ["district", "nonprofit", "business"];
    const candidate = entityType ?? entity?.entity_type ?? null;
    if (candidate && knownTypes.includes(candidate as EntityType)) {
      return candidate as EntityType;
    }
    return null;
  }, [entityType, entity?.entity_type]);

  const allowedTabs = useMemo(() => getEntityTabKeys(resolvedType), [resolvedType]);
  const { activeTab, setActiveTab } = useEntityTabParam(allowedTabs);

  if (loading) {
    return (
      <div className="rounded-lg border border-brand-secondary-1 bg-brand-secondary-2 p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="rounded-lg border border-brand-secondary-1 bg-brand-secondary-2 p-6 text-brand-primary-2">
        {error ?? "Entity not found."}
      </div>
    );
  }

  const mobileHeader = (
    <div className="flex items-center gap-3 rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4">
      {resolvedType ? (
        <EntityLogo entityId={entity.id} entityType={resolvedType} size={56} />
      ) : null}
      {/* <div>
        <div className="text-lg font-semibold text-gray-900">
          {entity.name ?? "Entity"}
        </div>
        {resolvedType ? (
          <div className="text-xs text-gray-500 capitalize">{resolvedType}</div>
        ) : null}
      </div> */}
    </div>
  );

  const mobileTabs = (
    <EntityPanelTabs
      activeTab={activeTab}
      onTabChange={setActiveTab}
      entityType={resolvedType}
      tabsVariant="select"
    />
  );

  return (
    <div className="rounded-lg border border-brand-secondary-1 bg-brand-secondary-2 p-4 md:p-6">
      <EntityPageLayout
        entityId={entity.id}
        entityName={entity.name ?? "Entity"}
        entityType={resolvedType}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileHeader={mobileHeader}
        tabs={mobileTabs}
      >
        {/* <div className="space-y-6"> */}
        {/* <EntityHeader
            entityId={entity.id}
            entityName={entity.name ?? "Entity"}
            entityType={resolvedType}
            slug={entity.slug ?? null}
            active={entity.active ?? null}
          /> */}
        <EntityPanelContent
          entityId={entity.id}
          entityType={resolvedType}
          entityName={entity.name ?? "Entity"}
          activeTab={activeTab}
        />
        {/* </div> */}
      </EntityPageLayout>
    </div>
  );
}
