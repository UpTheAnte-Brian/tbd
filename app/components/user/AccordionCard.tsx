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
    "overflow-hidden rounded-[24px] border border-border-subtle bg-surface-card text-text-on-light shadow-[0_18px_45px_rgba(15,23,42,0.08)]";
  const headerClasses =
    "flex w-full items-center justify-between border-b border-border-subtle bg-transparent px-5 py-4 text-left";
  const bodyClasses = "px-5 py-5";
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
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-text-on-light">
          {title}
        </span>
        <ChevronDown className={chevronClasses} />
      </button>
      {open && <div className={bodyClasses}>{children}</div>}
    </div>
  );
}
