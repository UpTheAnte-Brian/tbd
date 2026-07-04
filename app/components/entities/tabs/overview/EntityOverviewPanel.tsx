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
    <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 text-text-on-light shadow-sm">
      <div className="text-2xl font-semibold text-text-on-light">
        {data.name ?? "Entity"}
      </div>
      <div className="mt-1 text-sm opacity-70">
        {formatEntityType(data.entity_type)}
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide opacity-60">Website</dt>
          <dd className="mt-1 text-sm text-text-on-light">
            {website ? (
              <a
                href={website}
                className="text-brand-primary-0 underline-offset-2 hover:underline"
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
        <div>
          <dt className="text-xs uppercase tracking-wide opacity-60">
            Created
          </dt>
          <dd className="mt-1 text-sm text-text-on-light">
            {formatDate(data.created_at)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide opacity-60">
            Entity ID
          </dt>
          <dd className="mt-1 text-xs font-mono text-text-on-light">
            {data.id}
          </dd>
        </div>
      </dl>
    </div>
  );
}
