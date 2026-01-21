"use client";

import { useUser } from "@/app/hooks/useUser";
import AccordionCard from "@/app/components/user/AccordionCard";
import Link from "next/link";
import { EntityUser } from "@/app/lib/types/types";

export default function MyBusinesses() {
  const { user } = useUser();

  const businesses = (user?.entity_users ?? []).filter(
    (eu) => eu.entity_type === "business",
  ) as EntityUser[];

  if (businesses.length === 0) {
    return (
      <AccordionCard title="My Businesses">
        <p className="text-sm text-brand-secondary-2">No businesses assigned.</p>
      </AccordionCard>
    );
  }

  return (
    <AccordionCard title="My Businesses">
      <div className="space-y-2">
        {businesses.map((b) => {
          const name = b.entity_id;
          const businessId = b.entity_id;
          return (
            <div
              key={`${b.entity_id}-${b.role}`}
              className="rounded border border-brand-secondary-0 bg-brand-secondary-1 px-3 py-2"
            >
              {businessId ? (
                <Link
                  href={`/businesses/${businessId}`}
                  className="text-sm font-semibold text-brand-primary-1 hover:underline"
                >
                  {name}
                </Link>
              ) : (
                <div className="text-sm font-semibold text-brand-primary-1">
                  {name}
                </div>
              )}
              <div className="text-xs text-brand-secondary-2">Role: {b.role}</div>
            </div>
          );
        })}
      </div>
    </AccordionCard>
  );
}
