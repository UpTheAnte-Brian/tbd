import { BusinessUserJoined } from "@/app/lib/types";
import React from "react";

type UserRolesAssignmentsProps = {
  profiles: BusinessUserJoined[];
};

// composite key for a join row (unique per user+business pair)
const makeKey = (row: BusinessUserJoined) =>
  `${row.business_id}:${row.user_id}`;

// Displays user–business assignments with roles
const UserRolesAssignments: React.FC<UserRolesAssignmentsProps> = ({
  profiles,
}) => {
  return (
    <ul className="p-4 border border-gray-300 space-y-2">
      {profiles.map((assignment) => (
        <li
          key={makeKey(assignment)}
          className="p-2 border border-gray-200 rounded text-black"
        >
          <div className="font-semibold text-black">
            {assignment.user.username ?? "Unnamed user"}
          </div>
          <div className="text-sm text-gray-600">Role: {assignment.role}</div>
        </li>
      ))}
    </ul>
  );
};

export default UserRolesAssignments;
