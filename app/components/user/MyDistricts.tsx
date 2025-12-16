"use client";

import { useUser } from "@/app/hooks/useUser";
import AccordionCard from "@/app/components/user/AccordionCard";
import Link from "next/link";
import { EntityUser } from "@/app/lib/types/types";

export default function MyDistricts() {
  const { user } = useUser();

  const districts = (user?.entity_users ?? []).filter(
    (eu) => eu.entity_type === "district",
  ) as EntityUser[];

  if (districts.length === 0) {
    return (
      <AccordionCard title="My Districts">
        <p className="text-sm text-gray-400">No districts assigned.</p>
      </AccordionCard>
    );
  }

  return (
    <AccordionCard title="My Districts">
      <div className="space-y-2">
        {districts.map((d) => {
          const shortname = d.entity_id;
          const districtId = d.entity_id;
          return (
            <div
              key={`${d.entity_id}-${d.role}`}
              className="rounded border border-gray-700 bg-gray-950 px-3 py-2"
            >
              {districtId ? (
                <Link
                  href={`/districts/${districtId}`}
                  className="text-sm font-semibold text-white hover:underline"
                >
                  {shortname}
                </Link>
              ) : (
                <div className="text-sm font-semibold text-white">{shortname}</div>
              )}
              <div className="text-xs text-gray-400">Role: {d.role}</div>
            </div>
          );
        })}
      </div>
    </AccordionCard>
  );
}
