"use client";

import { useUser } from "@/app/hooks/useUser";
import AccordionCard from "@/app/components/user/AccordionCard";

export default function MyDistricts() {
  const { user } = useUser();

  if (!user?.district_users?.length) {
    return (
      <AccordionCard title="My Districts">
        <p className="text-sm text-gray-400">No districts assigned.</p>
      </AccordionCard>
    );
  }

  return (
    <AccordionCard title="My Districts">
      <div className="space-y-2">
        {user.district_users.map((d) => {
          const shortname = d?.district?.shortname ?? d?.district_id;
          return (
            <div
              key={`${d?.district_id}-${d?.role}`}
              className="rounded border border-gray-700 bg-gray-950 px-3 py-2"
            >
              <div className="text-sm font-semibold text-white">
                {shortname}
              </div>
              <div className="text-xs text-gray-400">Role: {d?.role}</div>
            </div>
          );
        })}
      </div>
    </AccordionCard>
  );
}
