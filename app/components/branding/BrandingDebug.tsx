"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const isBrandingDebugEnabled =
  process.env.NEXT_PUBLIC_BRANDING_DEBUG === "1" ||
  process.env.NEXT_PUBLIC_BRANDING_DEBUG === "true";

const BRAND_VARS = [
  "--brand-primary-0",
  "--brand-primary-1",
  "--brand-primary-2",
  "--brand-secondary-0",
  "--brand-secondary-1",
  "--brand-secondary-2",
  "--brand-accent-0",
  "--brand-accent-1",
  "--brand-accent-2",
] as const;

export default function BrandingDebug() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isBrandingDebugEnabled) return;
    if (typeof window === "undefined") return;

    const styles = getComputedStyle(document.documentElement);
    const tokens = BRAND_VARS.reduce<Record<string, string>>((acc, key) => {
      acc[key] = styles.getPropertyValue(key).trim();
      return acc;
    }, {});

    console.info("[branding-debug]", {
      route: pathname,
      tokens,
    });
  }, [pathname]);

  return null;
}
