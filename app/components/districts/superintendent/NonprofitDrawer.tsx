"use client";

import { useEffect, useState } from "react";
import FinancialTrend from "@/app/components/districts/superintendent/FinancialTrend";
import type {
    NonprofitDetail,
    NonprofitRow,
} from "@/app/components/districts/superintendent/types";

type DrawerProps = {
    open: boolean;
    row: NonprofitRow | null;
    detail: NonprofitDetail | null;
    onClose: () => void;
};

type DrawerTab = "overview" | "financials" | "narrative" | "people";

const tabLabels: Record<DrawerTab, string> = {
    overview: "Overview",
    financials: "Financials",
    narrative: "Narrative",
    people: "People",
};

function formatDate(value: string | null): string {
    if (!value) return "--";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
}

function formatRole(role: string): string {
    return role
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function NonprofitDrawer({
    open,
    row,
    detail,
    onClose,
}: DrawerProps) {
    const [activeTab, setActiveTab] = useState<DrawerTab>("overview");
    const [expandedNarrativeId, setExpandedNarrativeId] =
        useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setActiveTab("overview");
            setExpandedNarrativeId(null);
        }
    }, [open]);

    useEffect(() => {
        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }
        if (open) {
            window.addEventListener("keydown", handleKey);
        }
        return () => window.removeEventListener("keydown", handleKey);
    }, [open, onClose]);

    if (!open || !row || !detail) return null;

    const latestReturn = detail.returns[0] ?? null;
    const location = [
        detail.organization?.city ?? row.city ?? null,
        detail.organization?.state ?? row.state ?? null,
    ]
        .filter(Boolean)
        .join(", ");

    const lastThreeYears = detail.returns
        .slice(0, 3)
        .map((item) => item.tax_year)
        .filter(Boolean)
        .join(", ");

    const narratives = detail.narratives;
    const partIII = narratives.filter((narrative) => narrative.section === "part_iii");
    const otherNarratives = narratives.filter(
        (narrative) => narrative.section !== "part_iii",
    );

    const people = detail.people;
    const flaggedPeople = people.filter((person) => person.is_flagged);
    const plausiblePeople = people.filter((person) => !person.is_flagged);

    const showQualityWarning =
        row.people_parse_quality === "mixed" ||
        row.people_parse_quality === "poor";

    return (
        <div className="fixed inset-0 z-50 flex">
            <div
                className="absolute inset-0 bg-black/30"
                onClick={onClose}
            />
            <div className="relative ml-auto flex h-full w-full max-w-3xl flex-col bg-brand-primary-1 shadow-xl">
                <div className="flex items-start justify-between border-b border-border-subtle px-6 py-4">
                    <div>
                        <h3 className="text-xl font-semibold text-text-on-light">
                            {detail.organization?.legal_name ?? row.entity_name}
                        </h3>
                        <p className="text-sm text-text-on-light">
                            {location || "--"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-border-subtle px-3 py-1 text-sm text-text-on-light"
                    >
                        Close
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 border-b border-border-subtle px-6 py-3">
                    {(Object.keys(tabLabels) as DrawerTab[]).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`rounded-full px-3 py-1 text-sm font-medium ${
                                activeTab === tab
                                    ? "bg-brand-secondary-1 text-brand-primary-1"
                                    : "bg-brand-primary-1 text-text-on-light border border-border-subtle"
                            }`}
                        >
                            {tabLabels[tab]}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {activeTab === "overview" ? (
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-md border border-border-subtle p-3">
                                    <div className="text-xs uppercase tracking-wide text-text-on-light">
                                        EIN
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-text-on-light">
                                        {row.ein ?? "--"}
                                    </div>
                                </div>
                                <div className="rounded-md border border-border-subtle p-3">
                                    <div className="text-xs uppercase tracking-wide text-text-on-light">
                                        Latest Filing Period
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-text-on-light">
                                        {latestReturn
                                            ? `${formatDate(
                                                  latestReturn.tax_period_start,
                                              )} - ${formatDate(
                                                  latestReturn.tax_period_end,
                                              )}`
                                            : "--"}
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-md border border-border-subtle p-3">
                                <div className="text-xs uppercase tracking-wide text-text-on-light">
                                    Last 3 Tax Years
                                </div>
                                <div className="mt-2 text-sm font-semibold text-text-on-light">
                                    {lastThreeYears || "--"}
                                </div>
                            </div>
                            <div className="rounded-md border border-border-subtle p-3">
                                <div className="text-xs uppercase tracking-wide text-text-on-light">
                                    Filing Summary
                                </div>
                                <div className="mt-2 text-sm text-text-on-light">
                                    {latestReturn
                                        ? `Form ${latestReturn.return_type ?? "unknown"} filed in ${latestReturn.tax_year}`
                                        : "No IRS returns linked yet."}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {activeTab === "financials" ? (
                        <FinancialTrend rows={detail.financials_by_year} />
                    ) : null}

                    {activeTab === "narrative" ? (
                        <div className="space-y-4">
                            {narratives.length === 0 ? (
                                <div className="rounded-md border border-dashed border-border-subtle bg-brand-primary-1 p-4 text-sm text-text-on-light">
                                    No narratives available for the latest return.
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-md border border-border-subtle p-4">
                                        <div className="text-xs uppercase tracking-wide text-text-on-light">
                                            Part III Line 4
                                        </div>
                                        {partIII.length === 0 ? (
                                            <div className="mt-2 text-sm text-text-on-light">
                                                No Part III narrative extracted.
                                            </div>
                                        ) : (
                                            partIII.map((narrative) => {
                                                const isExpanded =
                                                    expandedNarrativeId ===
                                                    narrative.id;
                                                const preview =
                                                    narrative.raw_text.slice(
                                                        0,
                                                        240,
                                                    );
                                                const hasMore =
                                                    narrative.raw_text.length >
                                                    240;

                                                return (
                                                    <div
                                                        key={narrative.id}
                                                        className="mt-3 text-sm text-text-on-light"
                                                    >
                                                        <div className="font-semibold">
                                                            {narrative.label ??
                                                                "Narrative"}
                                                        </div>
                                                        <p className="mt-2">
                                                            {isExpanded
                                                                ? narrative.raw_text
                                                                : preview}
                                                            {!isExpanded &&
                                                            hasMore
                                                                ? "..."
                                                                : ""}
                                                        </p>
                                                        {hasMore ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setExpandedNarrativeId(
                                                                        isExpanded
                                                                            ? null
                                                                            : narrative.id,
                                                                    )
                                                                }
                                                                className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-accent-1"
                                                            >
                                                                {isExpanded
                                                                    ? "Collapse"
                                                                    : "Expand"}
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    {otherNarratives.length > 0 ? (
                                        <div className="rounded-md border border-border-subtle p-4">
                                            <div className="text-xs uppercase tracking-wide text-text-on-light">
                                                Other Narratives
                                            </div>
                                            <div className="mt-3 space-y-3">
                                                {otherNarratives.map(
                                                    (narrative) => (
                                                        <div
                                                            key={
                                                                narrative.id
                                                            }
                                                            className="text-sm text-text-on-light"
                                                        >
                                                            <div className="font-semibold">
                                                                {narrative.section}
                                                                {narrative.label
                                                                    ? ` - ${narrative.label}`
                                                                    : ""}
                                                            </div>
                                                            <p className="mt-1 text-text-on-light">
                                                                {
                                                                    narrative
                                                                        .raw_text
                                                                }
                                                            </p>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </div>
                    ) : null}

                    {activeTab === "people" ? (
                        <div className="space-y-4">
                            {showQualityWarning ? (
                                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                    People extraction quality is flagged as {" "}
                                    {row.people_parse_quality}. Review carefully.
                                </div>
                            ) : null}
                            {people.length === 0 ? (
                                <div className="rounded-md border border-dashed border-border-subtle bg-brand-primary-1 p-4 text-sm text-text-on-light">
                                    No people extracted for the latest return.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {plausiblePeople.map((person) => (
                                        <div
                                            key={person.id}
                                            className="rounded-md border border-border-subtle p-3"
                                        >
                                            <div className="text-sm font-semibold text-text-on-light">
                                                {person.name}
                                            </div>
                                            <div className="mt-1 text-xs text-text-on-light">
                                                {formatRole(person.role)}
                                                {person.title
                                                    ? ` | ${person.title}`
                                                    : ""}
                                                {person.average_hours_per_week !==
                                                null
                                                    ? ` | ${person.average_hours_per_week} hrs/wk`
                                                    : ""}
                                            </div>
                                        </div>
                                    ))}

                                    {flaggedPeople.length > 0 ? (
                                        <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                                                Flagged Rows
                                            </div>
                                            <div className="mt-2 space-y-2">
                                                {flaggedPeople.map((person) => (
                                                    <div
                                                        key={person.id}
                                                        className="text-sm text-rose-700"
                                                    >
                                                        {person.name}
                                                        {person.title
                                                            ? ` (${person.title})`
                                                            : ""}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
