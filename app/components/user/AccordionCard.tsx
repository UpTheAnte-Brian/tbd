"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
    onToggle?: (open: boolean) => void;
};

export default function AccordionCard({ title, children, defaultOpen = false, onToggle }: Props) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="rounded-lg border border-gray-700 bg-gray-900">
            <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-white"
                onClick={() => {
                    setOpen((o) => !o);
                    const next = !open;
                    onToggle?.(next);
                }}
            >
                <span className="font-semibold">{title}</span>
                <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                        open ? "rotate-180" : ""
                    }`}
                />
            </button>
            {open && <div className="border-t border-gray-800 px-4 py-3">{children}</div>}
        </div>
    );
}
