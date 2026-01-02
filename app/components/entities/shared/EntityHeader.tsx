"use client";

import type { EntityType } from "@/app/lib/types/types";
import { EntityLogo } from "@/app/components/branding/EntityLogo";

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
    <div className="rounded border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        {entityType ? (
          <EntityLogo entityId={entityId} entityType={entityType} size={44} />
        ) : null}
        {/* <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">{entityName}</h1>
          {entityType && (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {entityType}
            </span>
          )}
          {active === false && (
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
              inactive
            </span>
          )}
        </div> */}
      </div>
      {/* <div className="mt-2 text-xs text-gray-500">
        <span>ID: {entityId}</span>
        {slug ? <span className="ml-3">Slug: {slug}</span> : null}
      </div> */}
    </div>
  );
}
