"use client";

import { useUser } from "@/app/hooks/useUser";
import AccordionCard from "@/app/components/user/AccordionCard";
import Link from "next/link";

export default function MyNonprofits() {
  const { user } = useUser();

  if (!user?.nonprofit_users?.length) {
    return (
      <AccordionCard title="My Nonprofits">
        <p className="text-sm text-gray-400">No nonprofits assigned.</p>
      </AccordionCard>
    );
  }

  return (
    <AccordionCard title="My Nonprofits">
      <div className="space-y-2">
        {user.nonprofit_users.map((n) => {
          const name = n?.nonprofit?.name ?? n?.nonprofit_id;
          const nonprofitId = n?.nonprofit?.id ?? n?.nonprofit_id;
          return (
            <div
              key={`${n?.nonprofit_id}-${n?.role}`}
              className="rounded border border-gray-700 bg-gray-950 px-3 py-2"
            >
              {nonprofitId ? (
                <Link
                  href={`/nonprofits/${nonprofitId}`}
                  className="text-sm font-semibold text-white hover:underline"
                >
                  {name}
                </Link>
              ) : (
                <div className="text-sm font-semibold text-white">{name}</div>
              )}
              <div className="text-xs text-gray-400">Role: {n?.role}</div>
            </div>
          );
        })}
      </div>
    </AccordionCard>
  );
}
