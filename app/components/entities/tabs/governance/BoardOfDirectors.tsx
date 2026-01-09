"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import type {
  BoardMember,
  GovernanceSnapshot,
} from "@/domain/governance/governance";

interface BoardOfDirectorsProps {
  nonprofitId?: string;
  members?: BoardMember[];
}

/**
 * Public-facing, read-only "Board of Directors" component.
 * Ordered by board role priority:
 * president → vice_president → treasurer → secretary → board_member → null
 */
export default function BoardOfDirectors({
  nonprofitId,
  members: providedMembers,
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

  const sortedMembers = useMemo(() => {
    const activeMembers = members.filter(
      (member) => member.status === "active" && !member.term_end
    );
    return [...activeMembers].sort((a, b) => {
      const aOrder = a.role ? ROLE_ORDER[a.role] ?? 99 : 99;
      const bOrder = b.role ? ROLE_ORDER[b.role] ?? 99 : 99;
      return aOrder - bOrder;
    });
  }, [members]);

  async function fetchBoard() {
    try {
      setLoading(true);

      if (!nonprofitId) {
        setMembers([]);
        return;
      }

      const res = await fetch(`/api/entities/${nonprofitId}/governance`);
      if (!res.ok) throw new Error("Failed to load board");
      const snapshot: GovernanceSnapshot = await res.json();

      setMembers(snapshot.members ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (providedMembers) {
      setMembers(providedMembers);
      setLoading(false);
      return;
    }
    fetchBoard();
  }, [nonprofitId, providedMembers]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Board of Directors</h2>

      {loading ? (
        <LoadingSpinner />
      ) : sortedMembers.length === 0 ? (
        <p className="text-brand-secondary-0 opacity-70">
          No board members listed.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {sortedMembers.map((m) => (
            <div
              key={m.id}
              className="flex flex-col gap-2 rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4"
            >
              <p className="font-semibold text-lg">
                {m.profile?.full_name ?? "Unnamed User"}
              </p>

              <p className="text-sm text-brand-secondary-0 opacity-70 capitalize">
                {m.role?.replace("_", " ") ?? ""}
              </p>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
