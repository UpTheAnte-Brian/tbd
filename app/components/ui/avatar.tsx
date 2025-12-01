"use client";
import React, { useEffect, useState } from "react";
import { getSupabaseClient } from "@/utils/supabase/client";
import Image from "next/image";

export default function Avatar({
  uid,
  url,
  size,
  onUpload,
}: {
  uid: string | null;
  url: string | null;
  size: number;
  onUpload: (url: string) => void;
}) {
  const supabase = getSupabaseClient();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
    <div>
      {avatarUrl ? (
        <Image
          width={size}
          height={size}
          src={avatarUrl}
          alt="Avatar"
          className="avatar image"
          style={{ height: size, width: size }}
          priority
        />
      ) : (
        <div
          className="avatar no-image"
          style={{ height: size, width: size }}
        />
      )}
      <div style={{ width: size }}>
        <label className="button primary block" htmlFor="single">
          {uploading ? "Uploading ..." : "Upload"}
        </label>
        <input
          style={{ visibility: "hidden", position: "absolute" }}
          type="file"
          id="single"
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
      className="flex items-center justify-center rounded-full bg-blue-700 text-white font-semibold overflow-hidden"
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
