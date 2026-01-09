import { EntityUser, Profile } from "@/app/lib/types/types";
import React, { useState } from "react";

type UserRolesAssignmentsProps = {
  profiles: Array<
    EntityUser & {
      profile?: { id: string; full_name?: string | null; username?: string | null } | null;
    }
  >;
  entityType: "district" | "nonprofit" | "business";
  entityId: string;
  entityName: string;
  reload: () => void;
  availableUsers: Profile[];
};

const UserRolesAssignments: React.FC<UserRolesAssignmentsProps> = ({
  profiles,
  entityType,
  entityId,
  entityName,
  reload,
  availableUsers,
}) => {
  const roles: string[] = ["admin", "editor", "viewer", "employee"];
  const defaultRole = roles[0];

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>(defaultRole);
  const [adding, setAdding] = useState(false);

  const makeKey = (row: EntityUser) =>
    `${entityType}:${row.user_id}:${entityId}`;
  const entityUsersEndpoint = `/api/entities/${entityId}/users`;

  const handleRoleChange = async (
    userId: string,
    newRole: string,
    displayName: string
  ) => {
    try {
      const response = await fetch(entityUsersEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, userId, role: newRole }),
      });

      const result = await response.json();
      if (!response.ok) {
        alert(`Error updating role: ${result.error || "Failed to update"}`);
        return;
      }
      alert(`${displayName}'s role updated to ${newRole}`);
      reload();
    } catch (err) {
      console.error("Error updating role:", err);
      alert("An error occurred while updating the role.");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      alert("Please select a user to add.");
      return;
    }
    setAdding(true);
    try {
      const response = await fetch(entityUsersEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          userId: selectedUserId,
          role: selectedRole,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        alert(`Error adding user: ${result.error || "Failed to add user"}`);
        setAdding(false);
        return;
      }

      setSelectedUserId("");
      setSelectedRole(defaultRole);
      reload();
    } catch (err) {
      console.error("Error adding user:", err);
      alert("An error occurred while adding the user.");
    } finally {
      setAdding(false);
    }
  };

  // Filter availableUsers to exclude those already assigned
  const assignedUserIds = new Set(profiles.map((p) => p.user_id));
  const filteredAvailableUsers = availableUsers.filter(
    (user) => !assignedUserIds.has(user.id)
  );

  return (
    <div className="p-4 border border-gray-300 space-y-4 rounded">
      <div className="flex flex-col text-black">
        <div className="text-lg font-bold">{entityName}</div>
        <div className="text-sm text-gray-600 capitalize">
          Managing roles for {entityType}
        </div>
      </div>

      {/* Add User Form */}
      <form
        onSubmit={handleAddUser}
        className="p-2 border border-gray-200 rounded space-y-2 bg-gray-50"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="user-select" className="font-semibold text-black">
            Add User
          </label>
          <select
            id="user-select"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="border border-gray-400 rounded px-2 py-1 text-black"
          >
            <option value="">Select a user</option>
            {filteredAvailableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name ?? user.username ?? "Unnamed user"}
              </option>
            ))}
          </select>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="border border-gray-400 rounded px-2 py-1 text-black"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={adding}
            className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add User"}
          </button>
        </div>
      </form>

      <ul className="space-y-2">
        {profiles.map((assignment) => {
          const displayName =
            assignment.profile?.full_name ??
            assignment.profile?.username ??
            assignment.user_id;
          return (
            <li
              key={makeKey(assignment)}
              className="p-2 border border-gray-200 rounded text-black flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-black">{displayName}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  defaultValue={assignment.role}
                  onChange={(e) =>
                    handleRoleChange(
                      assignment.user_id,
                      e.target.value,
                      displayName
                    )
                  }
                  className="border border-gray-400 rounded px-2 py-1 text-black"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    if (!confirm(`Remove ${displayName}'s role?`)) return;
                    try {
                      const response = await fetch(
                        `${entityUsersEndpoint}?userId=${encodeURIComponent(
                          assignment.user_id
                        )}`,
                        { method: "DELETE" }
                      );
                      const result = await response.json();
                      if (!response.ok) {
                        alert(
                          `Error deleting role: ${result.error || "Failed"}`
                        );
                        return;
                      }
                      reload();
                    } catch (err) {
                      console.error("Error deleting role:", err);
                      alert("An error occurred while deleting the role.");
                    }
                  }}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default UserRolesAssignments;
