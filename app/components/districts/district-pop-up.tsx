"use client";

import Link from "next/link";
// import { useState } from "react";
import { Input } from "../../components/ui/input";
import { DistrictWithFoundation } from "../../lib/types";
// import FoundationEditor from "@/app/ui/districts/foundation-editor";
import React, { useEffect, useRef, useState } from "react";
import { DistrictDonateButton } from "@/app/components/stripe/DistrictDonationButton";

const DistrictPopUp = React.memo(
  ({
    district,
    isAdmin,
    onLogoUpload,
  }: {
    district: DistrictWithFoundation;
    isAdmin: boolean;
    onLogoUpload: (file: File, sdorgid: string) => Promise<void>;
    // handleSave: (district: DistrictWithFoundation) => void;
    // uploading: boolean;
    // handleLogoUpload: (
    //   e: React.ChangeEvent<HTMLInputElement>,
    //   sdorgid: string
    // ) => void;
    // handleSave: (district: DistrictWithFoundation) => void;
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
          <div className="text-lg font-semibold text-blue-500 text-center">
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
        {isAdmin && (
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => handleLogoUpload(e, district.sdorgid)}
            disabled={uploading}
          />
        )}
        <DistrictDonateButton
          districtId={district.id}
          anonymous={true}
        ></DistrictDonateButton>
      </div>
    );
  }
);

export default DistrictPopUp;
