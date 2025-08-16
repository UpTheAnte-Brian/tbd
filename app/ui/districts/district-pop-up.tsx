"use client";

import Link from "next/link";
// import { useState } from "react";
import { Input } from "../../components/ui/input";
import { DistrictWithFoundation } from "../../lib/types";
// import FoundationEditor from "@/app/ui/districts/foundation-editor";
import React, { useEffect, useRef, useState } from "react";

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
        <Link href={`/admin/districts/${district.sdorgid}`}>
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
        {/* <FoundationEditor
          key={district.sdorgid} // 👈 force remount on ID change
          foundation={
            district.foundation == null
              ? {
                  district_id: district.properties.sdorgid,
                  name: "",
                  contact: "",
                  website: district.properties.web_url,
                  founding_year: null,
                  average_class_size: null,
                  balance_sheet: null,
                  ...(district.foundation ?? {}),
                }
              : district.foundation
          }
          onSave={async (updated) => {
            try {
              if (!updated.district_id) {
                throw new Error("Missing district_id for foundation update");
              }

              const response = await fetch(
                `/api/foundations/${updated.district_id}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(updated),
                }
              );

              if (!response.ok) {
                throw new Error(
                  `Failed to save foundation: ${response.statusText}`
                );
              }

              const refreshed = await fetch(
                `/api/districts/${updated.district_id}`
              ).then((res) => res.json());
              // setDistrict(refreshed);
              handleSave(refreshed);
            } catch (error) {
              console.error("Error saving foundation data:", error);
            }
          }}
        /> */}
        {/* <Input
          placeholder="Metadata Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        /> */}

        {/* <button
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
          onClick={() =>
            handleSave(district.sdorgid, {
              foundation: { ...district.foundation, name: foundationName },
              metadata: { ...district.metadata, description },
            })
          }
        >
          Save
        </button> */}
      </div>
    );
  }
);

export default DistrictPopUp;
