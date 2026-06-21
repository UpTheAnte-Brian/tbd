"use client";

import Link from "next/link";
import type { EntityFeature } from "@/app/lib/types/map";
import React, { useEffect, useRef } from "react";
import { entityPath } from "@/app/lib/routes";

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
      <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-nav p-4 text-text-on-dark">
        <Link href={entityPath(String(district.id))}>
          <div className="text-center text-lg font-semibold text-text-on-dark underline decoration-brand-primary-0 underline-offset-4 hover:text-brand-primary-1">
            {props.name ?? props.slug ?? "District"}
          </div>
        </Link>
        <Link
          href={`/donate/${district.id}`}
          className="inline-block justify-center rounded bg-surface-accent px-4 py-2 text-center font-semibold text-text-on-dark hover:bg-brand-primary-2"
        >
          Donate
        </Link>
      </div>
    );
  },
);

export default DistrictPopUp;
