"use client";

import { useUser } from "@/app/hooks/useUser";
import { NonprofitUserJoined } from "@/app/lib/types";

export default function MyNonprofits() {
  const { user } = useUser();

  if (!user?.nonprofit_users?.length) {
    return <p className="text-sm text-gray-400">No nonprofits assigned.</p>;
  }

  return (
    <div className="space-y-2">
      {user.nonprofit_users.map((n) => {
        const name =
          (n as NonprofitUserJoined)?.nonprofit?.name ?? n?.nonprofit_id;
        return (
          <div
            key={`${n?.nonprofit_id}-${n?.role}`}
            className="rounded border border-gray-700 bg-gray-900 px-3 py-2"
          >
            <div className="text-sm font-semibold text-white">{name}</div>
            <div className="text-xs text-gray-400">Role: {n?.role}</div>
          </div>
        );
      })}
    </div>
  );
}
