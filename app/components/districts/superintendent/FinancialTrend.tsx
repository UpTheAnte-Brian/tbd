import type { FinancialTrendRow } from "@/app/components/districts/superintendent/types";

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

function formatDelta(value: number | null): string {
    if (value === null || Number.isNaN(value)) return "--";
    const sign = value > 0 ? "+" : "";
    return `${sign}${moneyFormatter.format(value)}`;
}

type FinancialTrendProps = {
    rows: FinancialTrendRow[];
};

export default function FinancialTrend({ rows }: FinancialTrendProps) {
    if (!rows.length) {
        return (
            <div className="rounded-md border border-dashed border-border-subtle bg-brand-primary-1 p-4 text-sm text-text-on-light">
                No financial trend data available yet.
            </div>
        );
    }

    const ordered = [...rows].sort((a, b) => {
        const yearA = a.tax_year ?? 0;
        const yearB = b.tax_year ?? 0;
        return yearB - yearA;
    });

    const withDelta = ordered.map((row, index) => {
        const previous = ordered[index + 1];
        const revenueDelta =
            previous &&
            row.total_revenue !== null &&
            previous.total_revenue !== null
                ? row.total_revenue - previous.total_revenue
                : null;
        const expenseDelta =
            previous &&
            row.total_expenses !== null &&
            previous.total_expenses !== null
                ? row.total_expenses - previous.total_expenses
                : null;
        const netAssetsDelta =
            previous &&
            row.net_assets_end !== null &&
            previous.net_assets_end !== null
                ? row.net_assets_end - previous.net_assets_end
                : null;

        return {
            ...row,
            revenueDelta,
            expenseDelta,
            netAssetsDelta,
        };
    });

    return (
        <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="min-w-[600px] w-full text-sm">
                <thead className="bg-brand-secondary-1 text-brand-primary-1">
                    <tr>
                        <th className="px-3 py-2 text-left font-medium">Year</th>
                        <th className="px-3 py-2 text-left font-medium">
                            Revenue
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                            Expenses
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                            Net Assets
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                    {withDelta.map((row) => (
                        <tr key={`${row.return_id}-${row.tax_year ?? 0}`}>
                            <td className="px-3 py-2 font-medium text-text-on-light">
                                {row.tax_year ?? "--"}
                            </td>
                            <td className="px-3 py-2 text-text-on-light">
                                <div>{formatMoney(row.total_revenue)}</div>
                                <div className="text-xs text-text-on-light">
                                    YoY {formatDelta(row.revenueDelta)}
                                </div>
                            </td>
                            <td className="px-3 py-2 text-text-on-light">
                                <div>{formatMoney(row.total_expenses)}</div>
                                <div className="text-xs text-text-on-light">
                                    YoY {formatDelta(row.expenseDelta)}
                                </div>
                            </td>
                            <td className="px-3 py-2 text-text-on-light">
                                <div>{formatMoney(row.net_assets_end)}</div>
                                <div className="text-xs text-text-on-light">
                                    YoY {formatDelta(row.netAssetsDelta)}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
