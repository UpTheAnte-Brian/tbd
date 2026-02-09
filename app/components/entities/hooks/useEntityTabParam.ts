"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { EntityType } from "@/domain/entities/types";
export type EntityTabId =
  | "overview"
  | "branding"
  | "contacts"
  | "map"
  | "governance"
  | "users"
  | "irs"
  | "superintendent";

export const ENTITY_TAB_LABELS: Record<EntityTabId, string> = {
  overview: "Overview",
  map: "Map",
  contacts: "Contacts",
  branding: "Branding",
  governance: "Governance",
  users: "Users",
  irs: "IRS",
  superintendent: "Superintendent",
};

const BASE_TABS: EntityTabId[] = [
  "overview",
  "map",
  "contacts",
  "branding",
  "governance",
  "users",
];

export function getEntityTabKeys(options?: {
  includeIrs?: boolean;
  includeSuperintendent?: boolean;
}): EntityTabId[] {
  const tabs = [...BASE_TABS];
  if (options?.includeIrs) tabs.push("irs");
  if (options?.includeSuperintendent) tabs.push("superintendent");
  return tabs;
}

const VALID_TABS = new Set<EntityTabId>([
  "overview",
  "branding",
  "contacts",
  "map",
  "governance",
  "users",
  "irs",
  "superintendent",
]);

function coerceTabKey(value: string | null): EntityTabId {
  const lower = (value ?? "overview").toLowerCase();
  if (VALID_TABS.has(lower as EntityTabId)) {
    return lower as EntityTabId;
  }
  return "overview";
}

export function getEntityTabLabel(
  tab: EntityTabId,
  entityType?: EntityType | null,
): string {
  if (tab === "governance" && entityType === "district") {
    return "School Board";
  }
  if (tab === "superintendent" && entityType === "district") {
    return "District Dashboard";
  }
  return ENTITY_TAB_LABELS[tab];
}

export function useEntityTabParam(allowedTabs?: EntityTabId[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = useMemo<EntityTabId>(() => {
    const candidate = coerceTabKey(searchParams.get("tab"));
    if (allowedTabs && !allowedTabs.includes(candidate)) {
      return "overview";
    }
    return candidate;
  }, [allowedTabs, searchParams]);

  const setActiveTab = useCallback(
    (tab: EntityTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return { activeTab, setActiveTab };
}
