"use client";

import Link from "next/link";
import { Input } from "../../components/ui/input";
import { DistrictWithFoundation, Profile } from "../../lib/types";
import React, { useEffect, useRef, useState } from "react";

const DistrictPopUp = React.memo(
  ({
    district,
    user,
    onLogoUpload,
  }: {
    district: DistrictWithFoundation;
    user: Profile | null;
    onLogoUpload: (file: File, sdorgid: string) => Promise<void>;
  }) => {
    const [uploading, setUploading] = useState(false);
    const isMounted = useRef(true);

    const handleLogoUpload = async (
      e: React.ChangeEvent<HTMLInputElement>,
      sdorgid: string
    ) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (isMounted.current) {
        setUploading(true);
      }

      try {
        await onLogoUpload(file, sdorgid);
      } finally {
        if (isMounted.current) {
          setUploading(false);
        }
      }
    };

    useEffect(() => {
      // Cleanup function
      return () => {
        isMounted.current = false;
      };
    }, []);

    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3">
        <Link href={`/districts/${district.sdorgid}`}>
          <div className="text-lg font-semibold text-blue-500 underline decoration-blue-500 text-center hover:underline hover:decoration-blue-700">
            {district.shortname} ({Number(district.properties.sdnumber)})
          </div>
        </Link>
        {district.metadata?.logo_path && (
          <img
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/${process.env.NEXT_PUBLIC_SUPABASE_STORAGE_LOGO_PATH}${district.metadata.logo_path}`}
            alt="Logo"
            className="h-10 object-contain"
          />
        )}
        {user && (
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => handleLogoUpload(e, district.sdorgid)}
            disabled={uploading}
          />
        )}
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
