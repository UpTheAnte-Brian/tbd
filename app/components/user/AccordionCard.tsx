"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
};

export default function AccordionCard({
  title,
  children,
  defaultOpen = false,
  onToggle,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const containerClasses =
    "rounded-lg border border-brand-secondary-1 bg-brand-secondary-2 text-brand-secondary-0";
  const headerClasses =
    "flex w-full items-center justify-between border-b border-brand-secondary-1 px-4 py-3 text-left bg-brand-secondary-2 text-brand-secondary-0";
  const bodyClasses = "px-4 py-3";
  const chevronClasses = `h-4 w-4 text-brand-secondary-0 transition-transform ${
    open ? "rotate-180" : ""
  }`;

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
