"use client";

import type { EntityType } from "@/app/lib/types/types";

type Props = {
  entityId: string;
  entityName: string;
  entityType: EntityType | null;
  slug?: string | null;
  active?: boolean | null;
};

export default function EntityHeader({
  entityId,
  entityName,
  entityType,
  slug,
  active,
}: Props) {
  return (
    <div className="rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-brand-secondary-0">
          {entityName}
        </h1>
        {entityType && (
          <span className="rounded bg-brand-secondary-1 px-2 py-0.5 text-xs text-brand-secondary-0">
            {entityType}
          </span>
        )}
        {active === false && (
          <span className="rounded bg-brand-primary-2 px-2 py-0.5 text-xs text-brand-secondary-2">
            inactive
          </span>
        )}
      </div>
      <div className="mt-2 text-xs text-brand-secondary-0 opacity-70">
        <span>ID: {entityId}</span>
        {slug ? <span className="ml-3">Slug: {slug}</span> : null}
      </div>
    </div>
  );
}
