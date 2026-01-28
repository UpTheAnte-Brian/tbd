import type {
    NonprofitRow,
    SortDirection,
    SortKey,
} from "@/app/components/districts/superintendent/types";

const moneyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
});

function formatMoney(value: number | null): string {
    if (value === null || Number.isNaN(value)) return "--";
    return moneyFormatter.format(value);
}

function formatText(value: string | null | undefined): string {
    if (!value) return "--";
    return value;
}

type NonprofitTableProps = {
    rows: NonprofitRow[];
    totalRows: number;
    search: string;
    onSearchChange: (value: string) => void;
    sortKey: SortKey;
    sortDirection: SortDirection;
    onSortKeyChange: (value: SortKey) => void;
    onSortDirectionChange: (value: SortDirection) => void;
    onRowClick: (row: NonprofitRow) => void;
    selectedEntityId: string | null;
    onExportCsv?: () => void;
};

const qualityStyles: Record<
    NonprofitRow["people_parse_quality"],
    string
> = {
    good: "bg-emerald-100 text-emerald-800",
    mixed: "bg-amber-100 text-amber-800",
    poor: "bg-rose-100 text-rose-800",
    unknown: "bg-slate-100 text-slate-600",
};

export default function NonprofitTable({
    rows,
    totalRows,
    search,
    onSearchChange,
    sortKey,
    sortDirection,
    onSortKeyChange,
    onSortDirectionChange,
    onRowClick,
    selectedEntityId,
    onExportCsv,
}: NonprofitTableProps) {
    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                    <input
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Search by name or EIN"
                        className="w-full rounded-md border border-border-subtle bg-brand-primary-1 px-3 py-2 text-sm text-text-on-light focus:outline-none focus:ring-2 focus:ring-focus-ring"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="text-xs text-text-on-light">
                        Showing {rows.length} / {totalRows}
                    </div>
                    <select
                        value={sortKey}
                        onChange={(event) =>
                            onSortKeyChange(event.target.value as SortKey)
                        }
                        className="rounded-md border border-border-subtle bg-brand-primary-1 px-2 py-2 text-sm text-text-on-light"
                    >
                        <option value="revenue">Sort: Revenue</option>
                        <option value="assets">Sort: Assets</option>
                        <option value="net_assets">Sort: Net Assets</option>
                    </select>
                    <button
                        type="button"
                        onClick={() =>
                            onSortDirectionChange(
                                sortDirection === "asc" ? "desc" : "asc",
                            )
                        }
                        className="rounded-md border border-border-subtle bg-brand-primary-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-on-light"
                    >
                        {sortDirection === "asc" ? "Asc" : "Desc"}
                    </button>
                    {onExportCsv ? (
                        <button
                            type="button"
                            onClick={onExportCsv}
                            className="rounded-md bg-brand-secondary-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-brand-primary-1"
                        >
                            Export CSV
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border-subtle">
                <table className="min-w-[1000px] w-full text-sm">
                    <thead className="bg-brand-secondary-1 text-brand-primary-1">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium">
                                Nonprofit Name
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                                EIN
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                                Latest Tax Year
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                                Total Revenue
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                                Total Expenses
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                                Net Assets
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                                Narrative?
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                                People Parse
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                                City / State
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-3 py-6 text-center text-sm text-text-on-light"
                                >
                                    No nonprofits match this filter.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => {
                                const isSelected =
                                    selectedEntityId === row.entity_id;
                                const location = [
                                    row.city,
                                    row.state,
                                ]
                                    .filter(Boolean)
                                    .join(", ");

                                return (
                                    <tr
                                        key={row.entity_id}
                                        className={`cursor-pointer transition-colors hover:bg-brand-secondary-1/10 ${
                                            isSelected
                                                ? "bg-brand-secondary-1/10"
                                                : ""
                                        }`}
                                        onClick={() => onRowClick(row)}
                                    >
                                        <td className="px-3 py-2 font-medium text-text-on-light">
                                            {row.entity_name}
                                        </td>
                                        <td className="px-3 py-2 text-text-on-light">
                                            {formatText(row.ein)}
                                        </td>
                                        <td className="px-3 py-2 text-text-on-light">
                                            {row.latest_tax_year ?? "--"}
                                        </td>
                                        <td className="px-3 py-2 text-text-on-light">
                                            {formatMoney(row.total_revenue)}
                                        </td>
                                        <td className="px-3 py-2 text-text-on-light">
                                            {formatMoney(row.total_expenses)}
                                        </td>
                                        <td className="px-3 py-2 text-text-on-light">
                                            {formatMoney(row.net_assets_end)}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span
                                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                                    row.has_narrative
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : "bg-slate-100 text-slate-600"
                                                }`}
                                            >
                                                {row.has_narrative
                                                    ? "Yes"
                                                    : "No"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span
                                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                                    qualityStyles[
                                                        row.people_parse_quality
                                                    ]
                                                }`}
                                            >
                                                {row.people_parse_quality}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-text-on-light">
                                            {location || "--"}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
