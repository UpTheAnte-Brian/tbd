"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import type {
  BoardMember,
  GovernanceSnapshot,
} from "@/app/lib/types/governance";

interface BoardOfDirectorsProps {
  nonprofitId: string;
}

/**
 * Public-facing, read-only "Board of Directors" component.
 * Ordered by board role priority:
 * president → vice_president → treasurer → secretary → board_member → null
 */
export default function BoardOfDirectors({
  nonprofitId,
}: BoardOfDirectorsProps) {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);

  const ROLE_ORDER: Record<string, number> = {
    chair: 1,
    vice_chair: 2,
    secretary: 3,
    treasurer: 4,
    director: 5,
  };

  async function fetchBoard() {
    try {
      setLoading(true);

      const res = await fetch(`/api/nonprofits/${nonprofitId}/governance`);
      if (!res.ok) throw new Error("Failed to load board");
      const snapshot: GovernanceSnapshot = await res.json();

      const boardMembers = (snapshot.members ?? [])
        .filter((m) => m.status === "active")
        .sort((a, b) => {
          const aOrder = a.role ? ROLE_ORDER[a.role] ?? 99 : 99;
          const bOrder = b.role ? ROLE_ORDER[b.role] ?? 99 : 99;
          return aOrder - bOrder;
        });

      setMembers(boardMembers);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBoard();
  }, [nonprofitId]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Board of Directors</h2>

      {loading ? (
        <LoadingSpinner />
      ) : members.length === 0 ? (
        <p className="text-gray-400">No board members listed.</p>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {members.map((m) => (
            <div
              key={m.id}
              className="p-4 border rounded bg-gray-900 shadow-sm flex flex-col gap-2"
            >
              <p className="font-semibold text-lg">
                {m.profile?.full_name ?? "Unnamed User"}
              </p>

              <p className="text-sm text-gray-400 capitalize">
                {m.role?.replace("_", " ") ?? ""}
              </p>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
