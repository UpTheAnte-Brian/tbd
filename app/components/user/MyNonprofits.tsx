"use client";

import { useUser } from "@/app/hooks/useUser";
import AccordionCard from "@/app/components/user/AccordionCard";
import Link from "next/link";
import { EntityUser } from "@/app/lib/types/types";

export default function MyNonprofits() {
  const { user } = useUser();

  const nonprofits = (user?.entity_users ?? []).filter(
    (eu) => eu.entity_type === "nonprofit",
  ) as EntityUser[];

  if (nonprofits.length === 0) {
    return (
      <AccordionCard title="My Nonprofits">
        <p className="text-sm text-brand-secondary-2">No nonprofits assigned.</p>
      </AccordionCard>
    );
  }

  return (
    <AccordionCard title="My Nonprofits">
      <div className="space-y-2">
        {nonprofits.map((n) => {
          const name = n.entity_id;
          const nonprofitId = n.entity_id;
          return (
            <div
              key={`${n.entity_id}-${n.role}`}
              className="rounded border border-brand-secondary-0 bg-brand-secondary-1 px-3 py-2"
            >
              {nonprofitId ? (
                <Link
                  href={`/nonprofits/${nonprofitId}`}
                  className="text-sm font-semibold text-brand-primary-1 hover:underline"
                >
                  {name}
                </Link>
              ) : (
                <div className="text-sm font-semibold text-brand-primary-1">
                  {name}
                </div>
              )}
              <div className="text-xs text-brand-secondary-2">Role: {n.role}</div>
            </div>
          );
        })}
      </div>
    </AccordionCard>
  );
}
