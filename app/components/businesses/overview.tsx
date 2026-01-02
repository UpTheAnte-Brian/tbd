"use client";

import { Business } from "@/app/lib/types/types";
import PlaceMap from "@/app/components/places/place-map";

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
      <div className="flex flex-col md:flex-row gap-4 w-full">
        {/* Left content: 3/4 width */}
        <div className="w-full md:w-3/4 [&>*]:text-black">
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
        <div className="w-full md:w-1/4">
          <PlaceMap placeId={business.place_id!} />
        </div>
      </div>
    </div>
  );
}
