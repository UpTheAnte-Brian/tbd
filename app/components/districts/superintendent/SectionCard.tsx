"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type SectionCardProps = {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    collapsible?: boolean;
    defaultOpen?: boolean;
    onToggle?: (open: boolean) => void;
};

export default function SectionCard({
    title,
    subtitle,
    actions,
    children,
    className,
    collapsible = false,
    defaultOpen = true,
    onToggle,
}: SectionCardProps) {
    const [open, setOpen] = useState(defaultOpen);
    const isOpen = collapsible ? open : true;
    const chevronClasses = `h-4 w-4 text-text-on-light transition-transform ${
        isOpen ? "rotate-180" : ""
    }`;

    return (
        <section
            className={`rounded-lg border border-border-subtle bg-surface-card p-4 shadow-sm ${
                className ?? ""
            }`}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <button
                    type="button"
                    className={`flex flex-1 items-start justify-between gap-3 text-left ${
                        collapsible ? "" : "pointer-events-none"
                    }`}
                    aria-expanded={collapsible ? isOpen : undefined}
                    disabled={!collapsible}
                    onClick={() => {
                        if (!collapsible) return;
                        setOpen((prev) => {
                            const next = !prev;
                            onToggle?.(next);
                            return next;
                        });
                    }}
                >
                    <div>
                        <h2 className="text-lg font-semibold text-text-on-light">
                            {title}
                        </h2>
                        {subtitle ? (
                            <p className="text-sm text-text-on-light">
                                {subtitle}
                            </p>
                        ) : null}
                    </div>
                    {collapsible ? (
                        <ChevronDown className={chevronClasses} />
                    ) : null}
                </button>
                {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>
            {isOpen ? <div className="mt-4">{children}</div> : null}
        </section>
    );
}
