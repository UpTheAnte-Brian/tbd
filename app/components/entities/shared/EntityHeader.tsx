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

export default function EntityHeader({
  entityId,
  entityName,
  entityType,
  slug,
  active,
  showSuperintendentButton = false,
}: Props) {
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
            {active === false && (
              <span className="rounded-full bg-surface-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-on-dark">
                Inactive
              </span>
            )}
          </div>
          <div className="max-w-2xl text-sm text-brand-secondary-0 opacity-80">
            Entity workspace, records, and related operational data.
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
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-border-subtle bg-surface-page p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-secondary-0 opacity-70">
            Entity ID
          </dt>
          <dd className="mt-2 break-all font-mono text-xs text-text-on-light">
            {entityId}
          </dd>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface-page p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-secondary-0 opacity-70">
            Slug
          </dt>
          <dd className="mt-2 text-sm text-text-on-light">{slug ?? "—"}</dd>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface-page p-4 sm:col-span-2 xl:col-span-1">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-secondary-0 opacity-70">
            Status
          </dt>
          <dd className="mt-2 text-sm text-text-on-light">
            {active === false ? "Inactive" : "Active"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
