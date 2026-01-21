"use client";
import { useEffect, useState } from "react";
import { EntityUser, Profile } from "@/app/lib/types/types";
import Link from "next/link";

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load users
  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersRes = await fetch("/api/users");
        if (!usersRes.ok) throw new Error("Failed to load users");

        const usersData = (await usersRes.json()) as Profile[];
        setUsers(usersData);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load data";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Change user role
  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch (err) {
      console.error(err);
      alert("Error updating role");
    }
  };

  if (loading) return <div>Loading…</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Users</h1>
      <table className="w-full border-collapse border border-brand-secondary-2">
        <thead>
          <tr className="bg-brand-secondary-2">
            <th className="border border-brand-secondary-2 px-2 py-1 text-left text-brand-secondary-1">
              Name
            </th>
            <th className="border border-brand-secondary-2 px-2 py-1 text-left text-brand-secondary-1">
              Role
            </th>
            <th className="border border-brand-secondary-2 px-2 py-1 text-left text-brand-secondary-1">
              Districts
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="border border-brand-secondary-2 px-2 py-1">
                <Link
                  href={`/users/${u.id}`}
                  className="text-brand-accent-1 hover:underline"
                >
                  {!u.full_name
                    ? !u.username
                      ? u.id
                      : u.username
                    : u.full_name}
                </Link>
              </td>
              <td className="border border-brand-secondary-2 px-2 py-1">
                <select
                  className="w-full bg-brand-primary-1 text-brand-secondary-1 border border-brand-secondary-2 rounded px-2 py-1"
                  value={u.global_role || ""}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                >
                  <option value="Patron">Patron</option>
                  <option value="admin">admin</option>
                </select>
              </td>

              <td className="border border-brand-secondary-2 px-2 py-1">
                {(u.entity_users ?? []).filter((eu) => eu.entity_type === "district").length >
                0 ? (
                  <ul className="list-disc pl-4 text-brand-secondary-1">
                    {(u.entity_users as EntityUser[] | undefined)
                      ?.filter((eu) => eu.entity_type === "district")
                      .map((eu) => (
                        <li key={eu.entity_id}>{eu.entity_id}</li>
                      ))}
                  </ul>
                ) : (
                  <span className="text-brand-secondary-0 italic">None</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
