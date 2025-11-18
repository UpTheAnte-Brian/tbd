import { Profile, Business } from "@/app/lib/types";
import UserRolesAssignments from "@/app/components/ui/user-roles-assignments";
import { useEffect, useState } from "react";

export default function BusinessAdmin({
  user,
  business,
  reloadBusiness,
}: {
  user: Profile;
  business: Business;
  reloadBusiness: () => void;
}) {
  const [users, setUsers] = useState<Profile[]>([]);

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

  return (
    <div className="flex flex-row sm:flex-col">
      <div className="flex-1 border-r border-gray-300 p-4">
        {business.status === "pending" && (
          <div className="mb-6 p-4 border border-orange-400 bg-orange-50 rounded">
            <h3 className="text-xl font-semibold text-orange-700 mb-2">
              Business Registration Pending
            </h3>

            <p className="text-black mb-3">
              The following users are associated with this business:
            </p>

            <ul className="list-disc ml-6 text-black mb-4">
              {(business.users || []).map((u) => (
                <li className="text-black" key={u.user.id}>
                  {u.user.first_name} {u.user.last_name} - {u.role}
                </li>
              ))}
            </ul>

            <button
              onClick={async () => {
                await fetch("/api/businesses/approve", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ business_id: business.id }),
                });
                window.location.reload();
              }}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Approve Business
            </button>
            <button
              onClick={async () => {
                await fetch("/api/businesses/reject", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ business_id: business.id }),
                });
                window.location.reload();
              }}
              className="ml-3 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reject Business
            </button>
            {/* <div className="w-64 pt-2">
              <PlaceMap placeId={business.place_id!} />
            </div> */}
          </div>
        )}
        <div className="text-2xl font-bold text-black mb-4">
          Welcome {user.first_name}. This is where we could collect any data we
          don't want publicly known
        </div>
        <ul>
          <li className="text-black">
            Daily Transaction Estimates - How many people are asked to Up the
            Ante?{" "}
          </li>
          <li className="text-black">Point of Sale Software info</li>
        </ul>
        <p className="text-black">
          Let's put a list of employees here, like meet the team.{" "}
        </p>
      </div>
      <div className="w-full p-4">
        <UserRolesAssignments
          profiles={business.users || []}
          entityType="business"
          entityId={business.id}
          entityName={business.name}
          reload={reloadBusiness}
          availableUsers={
            !business.users
              ? users
              : users.filter(
                  (u) =>
                    !business.users!.some(
                      (assigned) => assigned.user_id === u.id
                    )
                )
          }
        />
      </div>
    </div>
  );
}
