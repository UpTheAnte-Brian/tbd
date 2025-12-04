"use client";

import { DistrictWithFoundation } from "@/app/lib/types/types";
import DistrictCard from "@/app/components/districts/district-card";
import { getSupabaseClient } from "@/utils/supabase/client";
import { Input } from "@/app/components/ui/input";
import React from "react";
import { useState, useRef, useCallback, useEffect } from "react";

const cardWrapper = "grid gap-4 p-6 sm:grid-cols-2 md:grid-cols-3";

const DistrictMetadataEditor = React.memo(() => {
  const [districts, setDistricts] = useState<DistrictWithFoundation[]>([]);
  const [uploading, setUploading] = useState(false);
  const [, setUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const isMounted = useRef(true);
  const supabase = getSupabaseClient();

  const updateDistrictInList = useCallback(
    (district: DistrictWithFoundation) => {
      setDistricts((prev) =>
        prev.map((d) =>
          d.sdorgid === district.sdorgid ? { ...d, ...district } : d
        )
      );
    },
    []
  );

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchDistricts = async () => {
      const res = await fetch("/api/districts");
      const json = await res.json();
      setDistricts(json.features);
    };

    fetchDistricts();

    // Load session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUserId(data.session.user.id);
      } else {
        console.warn("No active session found");
      }
    });
  }, []);

  const handleLogoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    sdorgid: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop();
    const filePath = `district-logos/${sdorgid}/logo.${extension}`;
    if (isMounted.current) {
      setUploading(true);
    }
    const formData = new FormData();
    formData.append("file", file);
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(filePath, formData, { upsert: true });

    if (!uploadError) {
      const { error } = await supabase.from("district_metadata").upsert({
        sdorgid,
        logo_path: filePath,
      });
      if (error) {
        console.log("metadata upsert error: ", error);
      }

      if (isMounted.current) {
        setDistricts((prev) =>
          prev.map((d) =>
            d.sdorgid === sdorgid
              ? { ...d, metadata: { logo_path: filePath } }
              : d
          )
        );
      }
      setUploading(false);
    } else {
      console.warn("upload error: ", uploadError);
    }
  };

  return (
    <div className="p-4">
      <Input
        className="mb-4 bg-slate-400 text-white"
        placeholder="Search districts..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className={cardWrapper}>
        {districts
          .filter(
            (district) =>
              district.shortname
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              district.sdorgid.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((district) => (
            <DistrictCard
              key={district.sdorgid}
              district={district}
              uploading={uploading}
              handleLogoUpload={handleLogoUpload}
              handleSave={updateDistrictInList}
            />
          ))}
      </div>
    </div>
  );
});

export default DistrictMetadataEditor;
