"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
  variant?: "default" | "district" | "brand";
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
};

export default function AccordionCard({
  title,
  children,
  defaultOpen = false,
  onToggle,
  variant = "default",
  className = "",
  headerClassName = "",
  bodyClassName = "",
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const isDistrict = variant === "district";
  const isBrand = variant === "brand";
  const containerClasses = `${
    isBrand
      ? "border-brand-primary-1 bg-brand-primary-0 text-brand-secondary-0"
      : isDistrict
        ? "border-district-primary-1 bg-district-primary-0 text-district-secondary-0"
        : "border-gray-700 bg-gray-900 text-white"
  } rounded-lg border ${className}`.trim();
  const headerClasses = `${
    isBrand
      ? "text-brand-secondary-0 bg-brand-accent-1"
      : isDistrict
        ? "text-district-secondary-0 bg-district-accent-1"
        : "text-white bg-blue-600"
  } flex w-full items-center justify-between px-4 py-3 text-left ${headerClassName}`.trim();
  const bodyClasses = `${
    isBrand
      ? "border-brand-primary-1"
      : isDistrict
        ? "border-district-primary-1"
        : "border-gray-800"
  } border-t px-4 py-3 ${bodyClassName}`.trim();
  const chevronClasses = `${
    isBrand
      ? "text-brand-primary-1"
      : isDistrict
        ? "text-district-primary-1"
        : "text-white"
  } h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`.trim();

  return (
    <div className={containerClasses}>
      <button
        type="button"
        className={headerClasses}
        onClick={() => {
          setOpen((o) => !o);
          const next = !open;
          onToggle?.(next);
        }}
      >
        <span className="font-semibold flex items-center gap-2">{title}</span>
        <ChevronDown className={chevronClasses} />
      </button>
      {open && <div className={bodyClasses}>{children}</div>}
    </div>
  );
}
