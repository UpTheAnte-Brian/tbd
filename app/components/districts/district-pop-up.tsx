"use client";

import Link from "next/link";
import { DistrictFeature } from "../../lib/types/types";
import React, { useEffect, useRef } from "react";

const DistrictPopUp = React.memo(
  ({ district }: { district: DistrictFeature }) => {
    const props = district.properties;
    const isMounted = useRef(true);

    useEffect(() => {
      // Cleanup function
      return () => {
        isMounted.current = false;
      };
    }, []);

    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3">
        <Link href={`/districts/${district.id}`}>
          <div className="text-lg font-semibold text-blue-500 underline decoration-blue-500 text-center hover:underline hover:decoration-blue-700">
            {props.shortname} ({Number(props.sdnumber)})
          </div>
        </Link>
        <Link
          href={`/donate/${district.id}`}
          className="inline-block px-4 py-2 bg-blue-600 text-white justify-center text-center rounded hover:bg-blue-700 hover:underline hover:decoration-blue-700"
        >
          Donate
        </Link>
      </div>
    );
  }
);

export default DistrictPopUp;
