"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminPageShell from "@/app/admin/_components/AdminPageShell";
import type { Profile } from "@/app/lib/types/types";

export default function AdminUsersClient() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/users", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load users");
        const data = (await res.json()) as Profile[];
        if (!cancelled) setUsers(data ?? []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load users";
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminPageShell
      title="Admin · Users"
      subtitle="Entity users, roles, invites, and audit trails."
    >
      <div className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm">
        {loading ? (
          <div className="text-sm text-brand-secondary-0">
            Loading users...
          </div>
        ) : error ? (
          <div className="text-sm text-rose-600">{error}</div>
        ) : users.length === 0 ? (
          <div className="text-sm text-brand-secondary-0">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-brand-secondary-0">
                  <th className="py-2 pr-3 font-semibold">Name</th>
                  <th className="py-2 pr-3 font-semibold">Global role</th>
                  <th className="py-2 pr-3 font-semibold">Entities</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const districtCount =
                    (user.entity_users ?? []).filter(
                      (eu) => eu.entity_type === "district",
                    ).length;
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-border-subtle text-brand-secondary-0"
                    >
                      <td className="py-2 pr-3">
                        <Link
                          href={`/users/${user.id}`}
                          className="text-brand-primary-0 hover:underline"
                        >
                          {user.full_name ?? user.username ?? user.id}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">
                        {user.global_role ?? "Patron"}
                      </td>
                      <td className="py-2 pr-3">
                        {districtCount > 0 ? (
                          <span>{districtCount} district(s)</span>
                        ) : (
                          <span className="opacity-70">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageShell>
  );
}
