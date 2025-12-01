"use client";

import { useUser } from "@/app/hooks/useUser";
import { BusinessUserJoined } from "@/app/lib/types";

export default function MyBusinesses() {
  const { user } = useUser();

  if (!user?.business_users?.length) {
    return <p className="text-sm text-gray-400">No businesses assigned.</p>;
  }

  return (
    <div className="space-y-2">
      {user.business_users.map((b) => {
        const name =
          (b as BusinessUserJoined)?.business?.name ?? b?.business_id;
        return (
          <div
            key={`${b?.business_id}-${b?.role}`}
            className="rounded border border-gray-700 bg-gray-900 px-3 py-2"
          >
            <div className="text-sm font-semibold text-white">{name}</div>
            <div className="text-xs text-gray-400">Role: {b?.role}</div>
          </div>
        );
      })}
    </div>
  );
}
