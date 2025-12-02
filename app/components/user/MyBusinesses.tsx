"use client";

import { useUser } from "@/app/hooks/useUser";
import AccordionCard from "@/app/components/user/AccordionCard";
import Link from "next/link";

export default function MyBusinesses() {
  const { user } = useUser();

  if (!user?.business_users?.length) {
    return (
      <AccordionCard title="My Businesses">
        <p className="text-sm text-gray-400">No businesses assigned.</p>
      </AccordionCard>
    );
  }

  return (
    <AccordionCard title="My Businesses">
      <div className="space-y-2">
        {user.business_users.map((b) => {
          const name = b?.business?.name ?? b?.business_id;
          const businessId = b?.business?.id ?? b?.business_id;
          return (
            <div
              key={`${b?.business_id}-${b?.role}`}
              className="rounded border border-gray-700 bg-gray-950 px-3 py-2"
            >
              {businessId ? (
                <Link
                  href={`/businesses/${businessId}`}
                  className="text-sm font-semibold text-white hover:underline"
                >
                  {name}
                </Link>
              ) : (
                <div className="text-sm font-semibold text-white">{name}</div>
              )}
              <div className="text-xs text-gray-400">Role: {b?.role}</div>
            </div>
          );
        })}
      </div>
    </AccordionCard>
  );
}
