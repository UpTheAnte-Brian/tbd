"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type EntityTabContext,
  type EntityTabKey,
  getVisibleEntityTabKeys,
  isEntityTabKey,
} from "@/app/components/entities/entityTabs";

function coerceTabKey(value: string | null): EntityTabKey {
  const lower = (value ?? "overview").toLowerCase();
  if (lower === "onboarding") {
    return "superintendent";
  }
  if (isEntityTabKey(lower)) {
    return lower;
  }
  return "overview";
}

function resolveTabKey(
  value: string | null,
  visibleTabs: EntityTabKey[],
): EntityTabKey {
  const candidate = coerceTabKey(value);
  if (!visibleTabs.includes(candidate)) {
    return "overview";
  }
  return candidate;
}

export function useEntityTabParam(context: EntityTabContext) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const visibleTabs = useMemo(
    () => getVisibleEntityTabKeys(context),
    [context],
  );

  const activeTab = useMemo<EntityTabKey>(() => {
    return resolveTabKey(searchParams.get("tab"), visibleTabs);
  }, [searchParams, visibleTabs]);

  const setActiveTab = useCallback(
    (tab: EntityTabKey) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  return { activeTab, setActiveTab, visibleTabs };
}
