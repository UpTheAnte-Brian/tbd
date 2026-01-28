import type { AdminSummary } from "@/domain/admin/admin-summary";
import AdminSection from "@/app/components/admin/AdminSection";

type AdminStatusPanelProps = {
  summary: AdminSummary;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

const formatTimestamp = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function AdminStatusPanel({ summary }: AdminStatusPanelProps) {
  return (
    <AdminSection
      title="Status panel"
      subtitle={`Snapshot from ${formatTimestamp(summary.generatedAt)}`}
      className="lg:sticky lg:top-6"
    >
      <div className="space-y-4">
        {summary.errors.length ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            <div className="font-semibold uppercase tracking-[0.2em]">
              Partial data
            </div>
            <ul className="mt-2 space-y-1">
              {summary.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="rounded-lg border border-border-subtle bg-surface-inset p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-secondary-0">
            Entities by type
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {summary.entityCounts.map((row) => (
              <div key={row.key} className="rounded-md bg-surface-card p-2">
                <div className="text-xs text-brand-secondary-0">
                  {row.label}
                </div>
                <div className="text-lg font-semibold text-text-on-light">
                  {formatNumber(row.count)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-inset p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-secondary-0">
            Data freshness
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-lg font-semibold text-text-on-light">
              {formatNumber(summary.staleness.staleSourceRecords)}
            </div>
            <div className="text-xs text-brand-secondary-0">
              sources older than {summary.staleness.cutoffDays}d
            </div>
          </div>
          <div className="mt-1 text-xs text-brand-secondary-0">
            Total source records:{" "}
            {formatNumber(summary.staleness.totalSourceRecords)}
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-inset p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-secondary-0">
            Geometry coverage
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-brand-secondary-0">
                Missing boundary_simplified
              </span>
              <span className="font-semibold text-text-on-light">
                {formatNumber(summary.geometry.missingBoundarySimplified)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-brand-secondary-0">Missing point</span>
              <span className="font-semibold text-text-on-light">
                {formatNumber(summary.geometry.missingPoint)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-inset p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-secondary-0">
            Jobs
          </div>
          {summary.jobs.configured ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-brand-secondary-0">
                  Failures (last 7 days)
                </span>
                <span className="font-semibold text-text-on-light">
                  {formatNumber(summary.jobs.failuresLast7Days ?? 0)}
                </span>
              </div>
              <div className="text-xs text-brand-secondary-0">
                Last run: {summary.jobs.lastRunAt ?? "Unknown"}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-brand-secondary-0">
              Jobs tracking not configured.
            </p>
          )}
        </div>
      </div>
    </AdminSection>
  );
}
