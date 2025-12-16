import { useEffect, useState } from "react";
import { Profile, DistrictWithFoundation } from "@/app/lib/types/types";
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
      <div className="flex-1 border-gray-300 p-4">
        <div className="text-2xl font-bold text-black mb-4">
          Welcome {user.first_name}. This is where we can manage users for the
          district.
        </div>
        <ul className="list-disc list-inside space-y-1 [&>*]:text-black">
          <li>This tab should be restricted to authenticated at a minimum. </li>
          <li>Admin on the Profile table or entity admin for the district.</li>
          <li>Get rid of the alerts. </li>
          <li>Fix the look of the User Role Assignments. </li>
        </ul>
        <p className="text-black">The list below should be updated for changes. </p>
      </div>
      <UserRolesAssignments
        profiles={assignedUsers}
        entityType="district"
        entityId={district.id}
        entityName={district.shortname}
        reload={reloadDistrict}
        availableUsers={users.filter(
          (u) => !assignedUsers.some((assigned) => assigned.user_id === u.id),
        )}
      />
    </div>
  );
}
