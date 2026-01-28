"use client";

import { useMemo, useState } from "react";
import KpiRow from "@/app/components/districts/superintendent/KpiRow";
import NonprofitDrawer from "@/app/components/districts/superintendent/NonprofitDrawer";
import NonprofitTable from "@/app/components/districts/superintendent/NonprofitTable";
import SectionCard from "@/app/components/districts/superintendent/SectionCard";
import type {
  NonprofitDetail,
  NonprofitRow,
  ScopeSummary,
  SortDirection,
  SortKey,
} from "@/app/components/districts/superintendent/types";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

function isValidNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatMoney(value: number | null): string {
  if (!isValidNumber(value)) return "--";
  return moneyFormatter.format(value);
}

function formatPercent(value: number | null): string {
  if (!isValidNumber(value)) return "--";
  return percentFormatter.format(value);
}

function sumValues(values: Array<number | null>): number {
    return values.reduce<number>(
        (acc, value) => (isValidNumber(value) ? acc + value : acc),
        0,
    );
}

type KpiTone = "neutral" | "good" | "warn";

type KpiItem = {
  label: string;
  value: string;
  helper?: string;
  tone?: KpiTone;
  loading?: boolean;
};

type SuperintendentDashboardProps = {
  rows: NonprofitRow[];
  detailsByEntityId: Record<string, NonprofitDetail>;
  scopeSummary?: ScopeSummary | null;
  scopeLoading?: boolean;
  error?: string | null;
};

export default function SuperintendentDashboard({
  rows,
  detailsByEntityId,
  scopeSummary,
  scopeLoading = false,
  error,
}: SuperintendentDashboardProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    const filtered = trimmed
      ? rows.filter((row) => {
          const name = row.entity_name.toLowerCase();
          const ein = row.ein?.toLowerCase() ?? "";
          return name.includes(trimmed) || ein.includes(trimmed);
        })
      : rows;

    const sorted = [...filtered].sort((a, b) => {
      const valueA =
        sortKey === "revenue"
          ? a.total_revenue
          : sortKey === "assets"
            ? a.total_assets_end
            : a.net_assets_end;
      const valueB =
        sortKey === "revenue"
          ? b.total_revenue
          : sortKey === "assets"
            ? b.total_assets_end
            : b.net_assets_end;

      if (valueA === null && valueB === null) return 0;
      if (valueA === null) return 1;
      if (valueB === null) return -1;
      return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
    });

    return sorted;
  }, [rows, search, sortDirection, sortKey]);

  const kpis = useMemo<KpiItem[]>(() => {
    const total = rows.length;
    const currentYear = new Date().getFullYear();
    const recentCount = rows.filter(
      (row) =>
        row.latest_tax_year !== null && row.latest_tax_year >= currentYear - 2,
    ).length;
    const recentRate = total > 0 ? recentCount / total : null;

    const totalRevenue = sumValues(rows.map((row) => row.total_revenue));
    const totalNetAssets = sumValues(rows.map((row) => row.net_assets_end));
    const narrativesCount = rows.filter((row) => row.has_narrative).length;
    const peopleIssuesCount = rows.filter((row) =>
      ["mixed", "poor"].includes(row.people_parse_quality),
    ).length;

    return [
      {
        label: "Nonprofits in scope",
        value: (scopeSummary?.nonprofits_in_scope ?? 0).toString(),
        loading: scopeLoading,
      },
      {
        label: "Recent filing rate",
        value: formatPercent(recentRate),
        helper: `${recentCount} filed in last 2 years`,
        tone:
          recentRate === null ? "neutral" : recentRate > 0.6 ? "good" : "warn",
      },
      {
        label: "Total revenue",
        value: formatMoney(totalRevenue),
      },
      {
        label: "Total net assets",
        value: formatMoney(totalNetAssets),
      },
      {
        label: "Narratives available",
        value: narrativesCount.toString(),
      },
      {
        label: "People parse flagged",
        value: peopleIssuesCount.toString(),
        tone: peopleIssuesCount > 0 ? "warn" : "good",
      },
    ];
  }, [rows, scopeSummary, scopeLoading]);

  const selectedRow =
    rows.find((row) => row.entity_id === selectedEntityId) ?? null;
  const selectedDetail = selectedRow
    ? (detailsByEntityId[selectedRow.entity_id] ?? null)
    : null;

  const handleExport = () => {
    const headers = [
      "Nonprofit Name",
      "EIN",
      "Latest Tax Year",
      "Total Revenue",
      "Total Expenses",
      "Net Assets",
      "Narrative",
      "People Parse",
      "City",
      "State",
    ];

    const escape = (value: string) => {
      if (value.includes(",") || value.includes("\n") || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const rowsCsv = filteredRows.map((row) =>
      [
        row.entity_name,
        row.ein ?? "",
        row.latest_tax_year?.toString() ?? "",
        row.total_revenue?.toString() ?? "",
        row.total_expenses?.toString() ?? "",
        row.net_assets_end?.toString() ?? "",
        row.has_narrative ? "Yes" : "No",
        row.people_parse_quality,
        row.city ?? "",
        row.state ?? "",
      ]
        .map(escape)
        .join(","),
    );

    const csvContent = [headers.join(","), ...rowsCsv].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "superintendent-dashboard.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-surface-page px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <div className="text-xs uppercase tracking-[0.2em] text-text-on-light">
            Quarterly transparency review
          </div>
          <h1 className="text-2xl font-semibold text-text-on-light">
            Superintendent Dashboard (v1)
          </h1>
          <p className="text-sm text-text-on-light">
            Transparency review across district-related nonprofits (sample:
            "Westonka" entities)
          </p>
          <p className="text-xs text-text-on-light">
            Last updated {new Date().toLocaleDateString()}
          </p>
        </header>

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <SectionCard
          title="Snapshot"
          subtitle="Quick signals to guide quarterly and annual review."
        >
          <KpiRow items={kpis} />
        </SectionCard>

        <SectionCard
          title="Nonprofits in scope"
          subtitle="Search, sort, and drill into the latest IRS filings."
        >
          <NonprofitTable
            rows={filteredRows}
            totalRows={rows.length}
            search={search}
            onSearchChange={setSearch}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortKeyChange={setSortKey}
            onSortDirectionChange={setSortDirection}
            onRowClick={(row) => setSelectedEntityId(row.entity_id)}
            selectedEntityId={selectedEntityId}
            onExportCsv={filteredRows.length ? handleExport : undefined}
          />
        </SectionCard>
      </div>

      <NonprofitDrawer
        open={Boolean(selectedRow && selectedDetail)}
        row={selectedRow}
        detail={selectedDetail}
        onClose={() => setSelectedEntityId(null)}
      />
    </div>
  );
}
