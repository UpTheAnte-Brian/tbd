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
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-1 text-left text-black">
              Name
            </th>
            <th className="border border-gray-300 px-2 py-1 text-left text-black">
              Role
            </th>
            <th className="border border-gray-300 px-2 py-1 text-left text-black">
              Districts
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="border border-gray-300 px-2 py-1">
                <Link
                  href={`/users/${u.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {!u.full_name
                    ? !u.username
                      ? u.id
                      : u.username
                    : u.full_name}
                </Link>
              </td>
              <td className="border border-gray-300 px-2 py-1">
                <select
                  className="w-full bg-white text-black border border-gray-300 rounded px-2 py-1"
                  value={u.global_role || ""}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                >
                  <option value="Patron">Patron</option>
                  <option value="admin">admin</option>
                </select>
              </td>

              <td className="border border-gray-300 px-2 py-1">
                {(u.entity_users ?? []).filter((eu) => eu.entity_type === "district").length >
                0 ? (
                  <ul className="list-disc pl-4 text-white">
                    {(u.entity_users as EntityUser[] | undefined)
                      ?.filter((eu) => eu.entity_type === "district")
                      .map((eu) => (
                        <li key={eu.entity_id}>{eu.entity_id}</li>
                      ))}
                  </ul>
                ) : (
                  <span className="text-gray-500 italic">None</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
