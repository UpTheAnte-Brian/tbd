// districtMetadataEditor.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "../../components/ui/input";
import { ApiDistrict } from "../../lib/types";
import { createClient } from "../../../utils/supabase/client";

const cardWrapper = "grid gap-4 p-6 sm:grid-cols-2 md:grid-cols-3";
const card =
  "rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3";

export default function DistrictMetadataEditor() {
  const [districts, setDistricts] = useState<ApiDistrict[]>([]);
  const [uploading, setUploading] = useState(false);
  const [userId] = useState<string | null>(null);
  const isMounted = useRef(true);
  const supabase = createClient();

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
    //   supabase.auth.getSession().then(({ data }) => {
    //     if (data.session?.user) {
    //       setUserId(data.session.user.id);
    //     } else {
    //       console.warn("No active session found");
    //     }
    //   });
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
    const { data, error: uploadError } = await supabase.storage
      .from("logos")
      .upload(filePath, file, { upsert: true });

    if (!uploadError) {
      console.log("upload data response: ", data);
      await supabase.from("district_metadata").upsert({
        sdorgid,
        logo_path: filePath,
      });

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
    }
  };

  const handleSignIn = () => {
    supabase.auth.signInWithOAuth({ provider: "google" });
  };

  return (
    <div className="p-4">
      {!userId ? (
        <button
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded shadow"
          onClick={handleSignIn}
        >
          Sign in with Google to Upload Logos
        </button>
      ) : null}

      <div className={cardWrapper}>
        {districts.map((district) => (
          <div key={district.sdorgid} className={card}>
            <div className="text-lg font-semibold">{district.shortname}</div>
            <div className="text-sm text-gray-500">{district.sdorgid}</div>
            {district.metadata?.logo_path && (
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}${process.env.NEXT_PUBLIC_SUPABASE_STORAGE_LOGO_PATH}${district.metadata.logo_path}`}
                alt="Logo"
                className="h-10 object-contain"
              />
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoUpload(e, district.sdorgid)}
              disabled={uploading}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
