import { useState, useEffect } from "react";
import { Profile, DistrictWithFoundation } from "@/app/lib/types";
import UserRolesAssignments from "@/app/components/ui/user-roles-assignments";

export default function DistrictAdmin({
  user,
  district,
  reloadDistrict,
}: {
  user: Profile;
  district: DistrictWithFoundation;
  reloadDistrict: () => void;
}) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [assignedUsers, setAssignedUsers] = useState(district.users || []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) throw new Error("Failed to load users");
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error("Error loading users:", err);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    setAssignedUsers(district.users || []);
  }, [district]);

  return (
    <div className="flex flex-row sm:flex-col">
      <div className="flex-1 border-r border-gray-300 p-4">
        <div className="text-2xl font-bold text-black mb-4">
          Welcome {user.first_name}. This is where we can manage users for the
          district.
        </div>
        <ul className="list-disc list-inside space-y-1 [&>*]:text-black">
          <li>This tab should be restricted to authenticated at a minimum. </li>
          <li>Role=Admin on the Profile table or </li>
          <li>Role=admin on the district_users table. </li>
          <li>Get rid of the alerts. </li>
          <li>Fix the look of the User Role Assignments. </li>
        </ul>
        <p className="text-black">
          The list below should be updated for changes.{" "}
        </p>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const userId = (
              form.elements.namedItem("userId") as HTMLSelectElement
            ).value;
            const role = (form.elements.namedItem("role") as HTMLSelectElement)
              .value;

            const response = await fetch("/api/district-users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ districtId: district.id, userId, role }),
            });

            const result = await response.json();
            if (!response.ok) {
              alert(`Error: ${result.error || "Failed to add user"}`);
              return;
            }

            form.reset();
            // alert(`Added user with ID ${userId} as ${role}`);
            await reloadDistrict();
          }}
          className="flex flex-col gap-2 mb-4"
        >
          <select
            name="userId"
            className="border border-gray-400 rounded px-2 py-1 text-black"
            required
          >
            <option value="">Select a user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} ({u.username})
              </option>
            ))}
          </select>

          <select
            name="role"
            className="border border-gray-400 rounded px-2 py-1 text-black"
            required
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>

          <button
            type="submit"
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Add User
          </button>
        </form>
      </div>
      <div className="w-64 p-4">
        <UserRolesAssignments
          profiles={assignedUsers}
          districtId={district.id}
        />
      </div>
    </div>
  );
}
