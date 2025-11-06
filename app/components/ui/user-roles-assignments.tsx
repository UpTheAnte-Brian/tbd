import { BusinessUserJoined } from "@/app/lib/types";
import React from "react";

type UserRolesAssignmentsProps = {
  profiles: BusinessUserJoined[];
  districtId: string;
};

const makeKey = (row: BusinessUserJoined) =>
  `${row.business_id}:${row.user_id}`;

const UserRolesAssignments: React.FC<UserRolesAssignmentsProps> = ({
  profiles,
  districtId,
}) => {
  const handleRoleChange = async (
    userId: string,
    newRole: string,
    userName: string
  ) => {
    try {
      const response = await fetch("/api/district-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ districtId, userId, role: newRole }),
      });

      const result = await response.json();
      if (!response.ok) {
        alert(`Error updating role: ${result.error || "Failed to update"}`);
        return;
      }
      alert(`${userName}'s role updated to ${newRole}`);
    } catch (err) {
      console.error("Error updating role:", err);
      alert("An error occurred while updating the role.");
    }
  };

  return (
    <ul className="p-4 border border-gray-300 space-y-2">
      {profiles.map((assignment) => (
        <li
          key={makeKey(assignment)}
          className="p-2 border border-gray-200 rounded text-black flex items-center justify-between"
        >
          <div>
            <div className="font-semibold text-black">
              {assignment.user.username ?? "Unnamed user"}
            </div>
          </div>
          <select
            defaultValue={assignment.role}
            onChange={(e) =>
              handleRoleChange(
                assignment.user_id,
                e.target.value,
                assignment.user.username ?? "User"
              )
            }
            className="border border-gray-400 rounded px-2 py-1 text-black"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
        </li>
      ))}
    </ul>
  );
};

export default UserRolesAssignments;
