"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import EntityPanelTabs from "@/app/components/entities/panels/EntityPanelTabs";
import EntityPanelContent from "@/app/components/entities/panels/EntityPanelContent";
import EntityPageLayout from "@/app/components/entities/EntityPageLayout";
import { EntityLogo } from "@/app/components/branding/EntityLogo";
import EntityHeader from "@/app/components/entities/shared/EntityHeader";
import { useEntityTabParam } from "@/app/components/entities/hooks/useEntityTabParam";
import type { EntityTabContext } from "@/app/components/entities/entityTabs";
import type { EntityType } from "@/domain/entities/types";
import { useUser } from "@/app/hooks/useUser";
import { getFeatureFlags } from "@/app/lib/featureFlags";
import type { GovernanceSnapshot } from "@/domain/governance/governance";

type EntityDetails = {
  id: string;
  entity_type: string | null;
  slug: string | null;
  name: string | null;
  active: boolean | null;
  ein?: string | null;
  has_irs_link?: boolean | null;
};

type Props = {
  entityId: string;
  entityType?: EntityType;
};

export default function EntityPanel({ entityId, entityType }: Props) {
  const { user } = useUser();
  const [entity, setEntity] = useState<EntityDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [governanceHasBoard, setGovernanceHasBoard] = useState(false);
  const isPlatformAdmin = user?.global_role === "admin";
  const featureFlags = useMemo(() => getFeatureFlags(), []);
  const entityUserRole = useMemo(
    () =>
      user?.entity_users?.find((eu) => eu.entity_id === entityId)?.role ?? null,
    [entityId, user?.entity_users],
  );
  const canManageUsersForEntity =
    isPlatformAdmin || entityUserRole === "admin" || entityUserRole === "editor";

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

  useEffect(() => {
    let cancelled = false;
    if (isPlatformAdmin) {
      setGovernanceHasBoard(true);
      return;
    }
    if (resolvedType !== "district" || !user?.id) {
      setGovernanceHasBoard(false);
      return;
    }
    const loadGovernanceSummary = async () => {
      try {
        const res = await fetch(`/api/entities/${entityId}/governance`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const snapshot = (await res.json()) as GovernanceSnapshot;
        if (!cancelled) {
          setGovernanceHasBoard(Boolean(snapshot?.board?.id));
        }
      } catch {
        if (!cancelled) {
          setGovernanceHasBoard(false);
        }
      }
    };
    loadGovernanceSummary();
    return () => {
      cancelled = true;
    };
  }, [entityId, isPlatformAdmin, resolvedType, user?.id]);

  const tabContext = useMemo<EntityTabContext>(
    () => ({
      entityType: resolvedType,
      hasIrsLink: entity?.has_irs_link ?? null,
      canViewDistrictGovernance:
        resolvedType !== "district" ? true : governanceHasBoard,
      isPlatformAdmin,
      canManageUsersForEntity,
      canReadDocumentsForEntity: isPlatformAdmin || Boolean(entityUserRole),
      canViewAgentForEntity: isPlatformAdmin || Boolean(entityUserRole),
      canReadBookkeepingForEntity: isPlatformAdmin || Boolean(entityUserRole),
      featureFlags,
    }),
    [
      entity?.has_irs_link,
      governanceHasBoard,
      isPlatformAdmin,
      resolvedType,
      canManageUsersForEntity,
      entityUserRole,
      featureFlags,
    ],
  );
  const { activeTab, setActiveTab, visibleTabs } = useEntityTabParam(
    tabContext,
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 text-text-on-light shadow-sm">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 text-brand-primary-2 shadow-sm">
        {error ?? "Entity not found."}
      </div>
    );
  }

  const mobileHeader = (
    <div className="flex items-center gap-4 rounded-[24px] border border-border-subtle bg-surface-card p-4 text-text-on-light shadow-sm">
      {resolvedType ? (
        <EntityLogo entityId={entity.id} entityType={resolvedType} size={56} />
      ) : null}
      <div className="min-w-0">
        <div className="truncate text-lg font-semibold text-text-on-light">
          {entity.name ?? "Entity"}
        </div>
        {resolvedType ? (
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-secondary-0 opacity-70">
            {resolvedType}
          </div>
        ) : null}
      </div>
    </div>
  );

  const mobileTabs = (
    <EntityPanelTabs
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabsVariant="select"
      allowedTabs={visibleTabs}
      tabContext={tabContext}
    />
  );

  return (
    <div className="rounded-[30px] border border-border-subtle bg-surface-page p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-6">
      <EntityPageLayout
        entityId={entity.id}
        entityName={entity.name ?? "Entity"}
        entityType={resolvedType}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileHeader={mobileHeader}
        tabs={mobileTabs}
        allowedTabs={visibleTabs}
        tabContext={tabContext}
      >
        <div className="space-y-6">
          <EntityHeader
            entityId={entity.id}
            entityName={entity.name ?? "Entity"}
            entityType={resolvedType}
            slug={entity.slug ?? null}
            active={entity.active ?? null}
            showSuperintendentButton={resolvedType === "district"}
          />
          <EntityPanelContent
            entityId={entity.id}
            entityType={resolvedType}
            entityName={entity.name ?? "Entity"}
            activeTab={activeTab}
            canManageContacts={canManageUsersForEntity}
          />
        </div>
      </EntityPageLayout>
    </div>
  );
}
