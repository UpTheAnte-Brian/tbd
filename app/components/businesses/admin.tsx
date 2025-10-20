import { Profile, Business } from "@/app/lib/types";
import UserRolesAssignments from "@/app/components/ui/user-roles-assignments";

export default function BusinessAdmin({
  user,
  business,
}: {
  user: Profile;
  business: Business;
}) {
  return (
    <div className="flex flex-row sm:flex-col">
      <div className="flex-1 border-r border-gray-300 p-4">
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
        <p>Let's put a list of users here with role. </p>
      </div>
      <div className="w-64 p-4">
        <UserRolesAssignments profiles={business.users || []} />
      </div>
    </div>
  );
}
