"use client";
import React, { useEffect, useState } from "react";
import { getSupabaseClient } from "@/utils/supabase/client";
import Image from "next/image";

export default function Avatar({
  uid,
  url,
  size,
  onUpload,
  secondaryAction,
}: {
  uid: string | null;
  url: string | null;
  size: number;
  onUpload: (url: string) => void;
  secondaryAction?: React.ReactNode;
}) {
  const supabase = getSupabaseClient();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputId = uid ? `avatar-upload-${uid}` : "avatar-upload";

  // Resolve storage path → public URL
  useEffect(() => {
    if (url) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(url);
      setAvatarUrl(data.publicUrl);
    } else {
      setAvatarUrl(null);
    }
  }, [url, supabase]);

  const uploadAvatar: React.ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${uid}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // hand the raw storage path back to parent
      onUpload(filePath);
    } catch (error) {
      console.error("Error uploading avatar: ", error);
      alert("Error uploading avatar!");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {avatarUrl ? (
        <Image
          width={size}
          height={size}
          src={avatarUrl}
          alt="Avatar"
          className="rounded-[22px] border border-[#d7dce5] object-cover shadow-sm"
          style={{ height: size, width: size }}
          priority
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-[22px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] text-sm font-semibold text-[#64748b]"
          style={{ height: size, width: size }}
        >
          No photo
        </div>
      )}
      <div
        style={{ width: secondaryAction ? "100%" : size }}
        className={
          secondaryAction
            ? "flex flex-col gap-3 sm:flex-row sm:items-center"
            : ""
        }
      >
        <label
          className={`inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#d7dce5] bg-white px-4 py-2.5 text-sm font-semibold text-[#0f172a] transition hover:bg-[#f8fafc] ${
            secondaryAction ? "" : "w-full"
          }`}
          htmlFor={inputId}
        >
          {uploading ? "Uploading..." : "Upload Photo"}
        </label>
        {secondaryAction ? (
          <div className="flex-1">{secondaryAction}</div>
        ) : null}
        <input
          style={{ visibility: "hidden", position: "absolute" }}
          type="file"
          id={inputId}
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
        />
      </div>
    </div>
  );
}

/**
 * SmallAvatar — lightweight display-only avatar
 * Uses the same Supabase public URL resolution but with no upload UI.
 * Ideal for lists, autocomplete dropdowns, role assignments, etc.
 */
export function SmallAvatar({
  name,
  url,
  size = 32,
}: {
  name: string | null;
  url: string | null;
  size?: number;
}) {
  const supabase = getSupabaseClient();
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  // Resolve storage path → public URL
  React.useEffect(() => {
    if (url) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(url);
      setAvatarUrl(data.publicUrl);
    } else {
      setAvatarUrl(null);
    }
  }, [url, supabase]);

  // fallback: initial letter avatar
  const letter = name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div
      className="flex items-center justify-center rounded-full bg-brand-secondary-0 text-brand-secondary-2 font-semibold overflow-hidden"
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          width={size}
          height={size}
          alt={name ?? "avatar"}
          style={{ width: size, height: size }}
        />
      ) : (
        letter
      )}
    </div>
  );
}
