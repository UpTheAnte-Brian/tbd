"use client";

export type EntityOverviewData = {
  id: string;
  name: string | null;
  website: string | null;
  entity_type: string | null;
  created_at: string | null;
};

type Props = {
  data: EntityOverviewData;
};

function formatEntityType(entityType: string | null) {
  if (!entityType) return "Unknown";
  return entityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function normalizeWebsite(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function EntityOverviewPanel({ data }: Props) {
  const website = normalizeWebsite(data.website);
  return (
    <div className="rounded-[24px] border border-border-subtle bg-surface-card p-6 text-text-on-light shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border-subtle pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-secondary-0 opacity-70">
            Overview
          </div>
          <div className="mt-2 text-2xl font-semibold text-text-on-light">
            Profile
          </div>
        </div>
        <div className="rounded-full border border-border-subtle bg-surface-page px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-secondary-0">
          {formatEntityType(data.entity_type)}
        </div>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-border-subtle bg-surface-page p-4">
          <dt className="text-[11px] uppercase tracking-[0.18em] opacity-60">
            Website
          </dt>
          <dd className="mt-2 text-sm text-text-on-light">
            {website ? (
              <a
                href={website}
                className="break-all text-brand-primary-0 underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {data.website}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface-page p-4">
          <dt className="text-[11px] uppercase tracking-[0.18em] opacity-60">
            Created
          </dt>
          <dd className="mt-2 text-sm text-text-on-light">
            {formatDate(data.created_at)}
          </dd>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface-page p-4 sm:col-span-2 xl:col-span-1">
          <dt className="text-[11px] uppercase tracking-[0.18em] opacity-60">
            Entity ID
          </dt>
          <dd className="mt-2 break-all text-xs font-mono text-text-on-light">
            {data.id}
          </dd>
        </div>
      </dl>
    </div>
  );
}
