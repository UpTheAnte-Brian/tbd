"use client";

import Link from "next/link";
import type { EntityFeature } from "@/app/lib/types/map";
import React, { useEffect, useRef } from "react";

const DistrictPopUp = React.memo(
  ({ district }: { district: EntityFeature }) => {
    const props = district.properties;
    const isMounted = useRef(true);

    useEffect(() => {
      // Cleanup function
      return () => {
        isMounted.current = false;
      };
    }, []);

    return (
      <div className="flex flex-col gap-3 rounded-xl border border-brand-secondary-1 bg-brand-secondary-1 p-4">
        <Link href={`/districts/${district.id}`}>
          <div className="text-center text-lg font-semibold text-brand-primary-0 underline decoration-brand-primary-0 hover:text-brand-primary-2">
            {props.name ?? props.slug ?? "District"}
          </div>
        </Link>
        <Link
          href={`/donate/${district.id}`}
          className="inline-block justify-center rounded bg-brand-primary-0 px-4 py-2 text-center text-brand-secondary-2 hover:bg-brand-primary-2"
        >
          Donate
        </Link>
      </div>
    );
  }
);

export default DistrictPopUp;
