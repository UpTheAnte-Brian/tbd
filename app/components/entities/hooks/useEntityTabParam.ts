"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type TabKey = "overview" | "branding" | "users" | "map";

export function useEntityTabParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = useMemo<TabKey>(() => {
    const lower = (searchParams.get("tab") ?? "overview").toLowerCase();
    if (lower === "branding") return "branding";
    if (lower === "users") return "users";
    if (lower === "map") return "map";
    return "overview";
  }, [searchParams]);

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
