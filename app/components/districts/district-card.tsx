"use client";

import Link from "next/link";
// import { useState } from "react";
import { Input } from "../../components/ui/input";
import { DistrictDetails } from "../../lib/types/types";
import React from "react";

const DistrictCard = React.memo(
  ({
    district,
    uploading,
    handleLogoUpload,
  }: {
    district: DistrictDetails;
    uploading: boolean;
    handleLogoUpload: (
      e: React.ChangeEvent<HTMLInputElement>,
      sdorgid: string
    ) => void;
  }) => {
    // const [description, setDescription] = useState(district.metadata?.description || "");
    // const [description, setDescription] = useState("");

    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3">
        <Link href={`/districts/${district.id}`}>
          <div className="text-lg font-semibold text-blue-600 underline text-center">
            {district.shortname} ({Number(district.sdnumber)})
          </div>
        </Link>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (district.sdorgid) handleLogoUpload(e, district.sdorgid);
          }}
          disabled={uploading}
        />
      </div>
    );
  }
);

export default DistrictCard;
