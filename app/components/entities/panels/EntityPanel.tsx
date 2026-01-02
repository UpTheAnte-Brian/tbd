"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LoadingSpinner from "@/app/components/loading-spinner";
import EntityHeader from "@/app/components/entities/shared/EntityHeader";
import EntityPanelTabs from "@/app/components/entities/panels/EntityPanelTabs";
import EntityPageLayout from "@/app/components/entities/EntityPageLayout";
import { EntityLogo } from "@/app/components/branding/EntityLogo";
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

type TabKey = "overview" | "branding" | "users" | "map";

export default function EntityPanel({ entityId, entityType }: Props) {
  const [entity, setEntity] = useState<EntityDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
    const knownTypes: EntityType[] = [
      "district",
      "nonprofit",
      "business",
    ];
    const candidate = entityType ?? entity?.entity_type ?? null;
    if (candidate && knownTypes.includes(candidate as EntityType)) {
      return candidate as EntityType;
    }
    return null;
  }, [entityType, entity?.entity_type]);

  const activeTab = useMemo<TabKey>(() => {
    const lower = (searchParams.get("tab") ?? "overview").toLowerCase();
    if (lower === "branding") return "branding";
    if (lower === "users") return "users";
    if (lower === "map") return "map";
    return "overview";
  }, [searchParams]);

  const handleTabChange = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="p-6 text-red-500">
        {error ?? "Entity not found."}
      </div>
    );
  }

  return (
    <EntityPageLayout
      entityId={entity.id}
      entityName={entity.name ?? "Entity"}
      entityType={resolvedType}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div className="md:hidden space-y-4">
        <div className="flex items-center gap-3 rounded border border-gray-200 bg-white p-4">
          {resolvedType ? (
            <EntityLogo
              entityId={entity.id}
              entityType={resolvedType}
              size={56}
            />
          ) : null}
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {entity.name ?? "Entity"}
            </div>
            {resolvedType ? (
              <div className="text-xs text-gray-500 capitalize">
                {resolvedType}
              </div>
            ) : null}
          </div>
        </div>
        <EntityPanelTabs
          entityId={entity.id}
          entityType={resolvedType}
          entityName={entity.name ?? "Entity"}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabsVariant="select"
        />
        <EntityHeader
          entityId={entity.id}
          entityName={entity.name ?? "Entity"}
          entityType={resolvedType}
          slug={entity.slug ?? null}
          active={entity.active ?? null}
        />
      </div>
      <EntityPanelTabs
        entityId={entity.id}
        entityType={resolvedType}
        entityName={entity.name ?? "Entity"}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showTabs={false}
      />
    </EntityPageLayout>
  );
}
