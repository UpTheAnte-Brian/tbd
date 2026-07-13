"use client";

import Link from "next/link";
import { entityPath } from "@/app/lib/routes";
import type { EntityType } from "@/domain/entities/types";

type Props = {
  entityId: string;
  entityName: string;
  entityType: EntityType | null;
  slug?: string | null;
  active?: boolean | null;
  showSuperintendentButton?: boolean;
};

function abbreviateMiddle(value: string, start = 8, end = 6) {
  if (value.length <= start + end + 3) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export default function EntityHeader({
  entityId,
  entityName,
  entityType,
  slug,
  active,
  showSuperintendentButton = false,
}: Props) {
  const statusLabel = active === false ? "Inactive" : "Active";
  const statusClasses =
    active === false
      ? "bg-surface-accent text-text-on-dark"
      : "bg-surface-page text-text-on-light";

  return (
    <div className="rounded-[24px] border border-border-subtle bg-surface-card p-5 text-text-on-light shadow-sm md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-text-on-light md:text-[2rem]">
              {entityName}
            </h1>
            {entityType && (
              <span className="rounded-full bg-surface-nav px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-on-dark">
                {entityType}
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${statusClasses}`}
            >
              {statusLabel}
            </span>
          </div>
          <div className="max-w-2xl text-sm text-brand-secondary-0 opacity-80">
            Entity workspace, records, and related operational data.
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-brand-secondary-0 opacity-80">
            {slug ? (
              <span className="rounded-full border border-border-subtle bg-surface-page px-3 py-1">
                Slug: {slug}
              </span>
            ) : null}
            <span
              className="rounded-full border border-border-subtle bg-surface-page px-3 py-1 font-mono"
              title={entityId}
            >
              ID: {abbreviateMiddle(entityId)}
            </span>
          </div>
        </div>
        {showSuperintendentButton ? (
          <Link
            href={entityPath(entityId, "superintendent")}
            className="inline-flex items-center rounded-full border border-border-subtle bg-surface-page px-4 py-2 text-sm font-semibold text-text-on-light transition hover:border-brand-secondary-1 hover:bg-surface-inset"
          >
            Superintendent Dashboard
          </Link>
        ) : null}
      </div>
    </div>
  );
}
