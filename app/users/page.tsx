"use client";
import { useEffect, useState } from "react";
import DistrictSearch from "@/app/map/components/district-search";
import { DistrictWithFoundation } from "@/app/lib/types";

type Profile = {
  id: string;
  full_name: string | null;
  districts: { id: string; sdorgid: string; shortname: string }[]; // 👈 added
};

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [features, setFeatures] = useState<DistrictWithFoundation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

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

  // Assign district → call API
  const handleAssignDistrict = async (districtId: string) => {
    if (!assigningUserId) return;

    try {
      const res = await fetch(`/api/users/${assigningUserId}/district`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ districtId }),
      });

      if (!res.ok) throw new Error("Failed to assign district");
      setAssigningUserId(null); // close modal
    } catch (err) {
      console.error(err);
      alert("Error assigning district");
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
                {u.full_name}
              </td>

              <td className="border border-gray-300 px-2 py-1">
                {u.districts && u.districts.length > 0 ? (
                  <ul className="list-disc pl-4 text-white">
                    {u.districts.map((d) => (
                      <li key={d.id}>{d.shortname}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-500 italic">None</span>
                )}
              </td>
              <td className="border border-gray-300 px-2 py-1">
                <button
                  className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  onClick={() => setAssigningUserId(u.id)}
                >
                  Assign District
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal for district search */}
      {assigningUserId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[500px] relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
              onClick={() => setAssigningUserId(null)}
            >
              ✕
            </button>
            <h2 className="text-lg font-bold mb-4">Assign District</h2>
            <DistrictSearch
              features={features}
              onSelect={(id) => handleAssignDistrict(id)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
