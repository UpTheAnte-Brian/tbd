"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { EntityType } from "@/domain/entities/types";

export type TabKey =
  | "overview"
  | "branding"
  | "users"
  | "map"
  | "governance"
  | "superintendent";

const BASE_TABS: TabKey[] = ["overview", "branding", "users", "map"];

export function getEntityTabKeys(
  entityType?: EntityType | null,
  options?: { includeSuperintendent?: boolean },
): TabKey[] {
  const includeSuperintendent = options?.includeSuperintendent ?? true;
  if (entityType === "nonprofit") {
    return [
      ...BASE_TABS.slice(0, 3),
      "governance" as TabKey,
      ...BASE_TABS.slice(3),
    ];
  }
  if (entityType === "district") {
    return includeSuperintendent
      ? ["overview", "superintendent", "branding", "users", "map"]
      : ["overview", "branding", "users", "map"];
  }
  return BASE_TABS;
}

function coerceTabKey(value: string | null): TabKey {
  const lower = (value ?? "overview").toLowerCase();
  if (lower === "branding") return "branding";
  if (lower === "users") return "users";
  if (lower === "map") return "map";
  if (lower === "governance") return "governance";
  if (lower === "superintendent") return "superintendent";
  return "overview";
}

export function useEntityTabParam(allowedTabs?: TabKey[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = useMemo<TabKey>(() => {
    const candidate = coerceTabKey(searchParams.get("tab"));
    if (allowedTabs && !allowedTabs.includes(candidate)) {
      return allowedTabs[0] ?? "overview";
    }
    return candidate;
  }, [allowedTabs, searchParams]);

  const setActiveTab = useCallback(
    (tab: TabKey) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return { activeTab, setActiveTab };
}
