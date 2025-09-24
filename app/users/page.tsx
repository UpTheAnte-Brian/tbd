"use client";
import { useEffect, useState } from "react";
import { DistrictWithFoundation, Profile } from "@/app/lib/types";
import Link from "next/link";
import AssignDistrictsModal from "@/app/components/districts/AssignDistrictsModal";

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [features, setFeatures] = useState<DistrictWithFoundation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignToId, setAssignToId] = useState<string | null>(null);

  // Load users + districts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, districtsRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/districts"),
        ]);

        if (!usersRes.ok) throw new Error("Failed to load users");
        if (!districtsRes.ok) throw new Error("Failed to load districts");

        const usersData = await usersRes.json();
        const geojson = await districtsRes.json();

        setUsers(usersData);
        setFeatures(geojson.features);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.message);
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

  const handleSaveAssignments = async () => {
    const user = users.find((u) => u.id === assignToId);
    if (!user) return;

    try {
      const res = await fetch("/api/user-districts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          districtIds: user.district_users.map((d) => d.district_id),
        }),
      });

      if (!res.ok) throw new Error("Failed to save assignments");

      // ✅ Close modal and rely on local state (already updated)
      setAssignToId(null);
    } catch (err) {
      console.error(err);
      alert("Error saving districts");
    }
  };

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
            <th className="border border-gray-300 px-2 py-1 text-black">
              Actions
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
                  value={u.role || ""}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                >
                  <option value="Patron">Patron</option>
                  <option value="admin">admin</option>
                </select>
              </td>

              <td className="border border-gray-300 px-2 py-1">
                {u.district_users && u.district_users.length > 0 ? (
                  <ul className="list-disc pl-4 text-white">
                    {u.district_users.map((d) => (
                      <li key={d.district_id}>{d.district.shortname}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-500 italic">None</span>
                )}
              </td>
              <td className="border border-gray-300 px-2 py-1">
                <button
                  className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  onClick={() => setAssignToId(u.id)}
                >
                  Assign District
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Modal for district search */}
      {assignToId && (
        <AssignDistrictsModal
          setAssignToId={setAssignToId}
          assignToId={assignToId!}
          handleSaveAssignments={() => {
            setUsers((localUsers) => {
              // localUsers is not defined here; we must pass it from modal
              // So instead, update handleSaveAssignments to accept localUsers
              return localUsers;
            });
            handleSaveAssignments();
          }}
          users={users}
          features={features}
          setUsers={setUsers}
          onClose={() => setAssignToId(null)}
        />
      )}
    </div>
  );
}
