import Link from "next/link";
import { Business } from "@/app/lib/types";

export default function BusinessOverview({
  business,
}: // user,
{
  business: Business;
  // user: Profile | null;
}) {
  return (
    <div>
      {/* Flex container for two-column layout */}
      <div className="flex gap-4 w-full">
        {/* Left content: 3/4 width */}
        <div className="w-3/4 [&>*]:text-black">
          <p>-</p>
          <p>- </p>
          <h3 className="text-lg font-semibold mb-2"> Data:</h3>
          <ul className="list-disc list-inside space-y-1 [&>*]:text-black">
            <li>
              Welcome {business.name}.Status: {business.status}
            </li>
          </ul>
          <p>
            -Establish donation goals and have a visual indicator of the status.
            e.g. Coins filling a vase.{" "}
          </p>
        </div>

        {/* Right sidebar: 1/4 width, sticky */}
        <div className="w-1/4 sticky top-4 self-start">
          <Link
            href={`/donate`}
            className="inline-block px-4 py-2 bg-blue-600 text-white justify-center text-center rounded hover:bg-blue-700 hover:underline hover:decoration-blue-700"
          >
            Donate
          </Link>
        </div>
      </div>
    </div>
  );
}
