"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";

interface BoardMember {
  id: string;
  nonprofit_id: string;
  user_id: string;
  role: string;
  board_role: string | null;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

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
    president: 1,
    vice_president: 2,
    treasurer: 3,
    secretary: 4,
    board_member: 5,
  };

  async function fetchBoard() {
    try {
      setLoading(true);

      const res = await fetch(`/api/nonprofit-users`);
      if (!res.ok) throw new Error("Failed to fetch nonprofit users");
      const allUsers: BoardMember[] = await res.json();

      const boardMembers = allUsers
        .filter((u) => u.nonprofit_id === nonprofitId && u.board_role !== null)
        .sort((a, b) => {
          const aOrder = a.board_role ? ROLE_ORDER[a.board_role] ?? 99 : 99;
          const bOrder = b.board_role ? ROLE_ORDER[b.board_role] ?? 99 : 99;
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
                {m.profiles?.full_name ?? "Unnamed User"}
              </p>

              <p className="text-sm text-gray-400 capitalize">
                {m.board_role?.replace("_", " ") ?? ""}
              </p>

              {m.profiles?.email && (
                <p className="text-sm text-gray-400">{m.profiles.email}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
