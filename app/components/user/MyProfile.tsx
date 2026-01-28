"use client";

import Avatar from "@/app/components/ui/avatar";
import { useUser } from "@/app/hooks/useUser";
import React, { useEffect, useRef, useState } from "react";
import AccordionCard from "@/app/components/user/AccordionCard";

type ProfileUpdatePayload = {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  website?: string | null;
  avatar_url?: string | null;
};

export default function MyProfile({
  defaultOpen = true,
}: {
  defaultOpen?: boolean;
}) {
  const { user, refreshUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const [fullname, setFullname] = useState<string>(user?.full_name ?? "");
  const [firstName, setFirstName] = useState<string | null>(
    user?.first_name ?? ""
  );
  const [lastName, setLastName] = useState<string | null>(
    user?.last_name ?? ""
  );
  const [username, setUsername] = useState<string | null>(user?.username ?? "");
  const [website, setWebsite] = useState<string | null>(user?.website ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.avatar_url ?? ""
  );

  const initialValuesRef = useRef({
    full_name: user?.full_name ?? "",
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    username: user?.username ?? "",
    website: user?.website ?? "",
    avatar_url: user?.avatar_url ?? "",
  });

  useEffect(() => {
    const snapshot = {
      full_name: user?.full_name ?? "",
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      username: user?.username ?? "",
      website: user?.website ?? "",
      avatar_url: user?.avatar_url ?? "",
    };
    initialValuesRef.current = snapshot;
    setFullname(snapshot.full_name);
    setFirstName(snapshot.first_name);
    setLastName(snapshot.last_name);
    setUsername(snapshot.username);
    setWebsite(snapshot.website);
    setAvatarUrl(snapshot.avatar_url);
  }, [user]);

  const hasChanges = (() => {
    if (!user) return false;
    const initial = initialValuesRef.current;
    return (
      (fullname ?? "") !== initial.full_name ||
      (firstName ?? "") !== initial.first_name ||
      (lastName ?? "") !== initial.last_name ||
      (username ?? "") !== initial.username ||
      (website ?? "") !== initial.website
    );
  })();

  async function patchProfile(update: ProfileUpdatePayload) {
    const response = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Failed to update profile");
    }
  }

  async function updateProfile({
    username,
    fullname,
    website,
    avatar_url,
    firstName,
    lastName,
  }: {
    username: string | null;
    fullname: string | null;
    website: string | null;
    avatar_url: string | null;
    firstName: string | null;
    lastName: string | null;
  }) {
    if (!user) return;
    try {
      setLoading(true);
      await patchProfile({
        full_name: fullname,
        first_name: firstName,
        last_name: lastName,
        username,
        website,
        avatar_url,
      });
      await refreshUser();
      alert("Profile updated!");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      alert("Error updating the data: " + message);
    } finally {
      setLoading(false);
    }
  }

  async function updateAvatarUrl(url: string | null) {
    if (!user) return;
    try {
      setLoading(true);
      await patchProfile({ avatar_url: url });
      await refreshUser();
    } catch (error: unknown) {
      console.error("Error updating avatar:", error);
      alert("Error updating avatar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AccordionCard title="My Profile" defaultOpen={open} onToggle={setOpen}>
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[240px,1fr]">
        <div className="flex flex-col items-start gap-3">
          <Avatar
            uid={user?.id ?? null}
            url={avatarUrl}
            size={220}
            onUpload={(url) => {
              setAvatarUrl(url);
              updateAvatarUrl(url);
            }}
            secondaryAction={
              <button
                className="w-full rounded bg-brand-primary-0 px-3 py-2 text-sm font-semibold text-brand-primary-1 hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() =>
                  updateProfile({
                    username,
                    fullname,
                    website,
                    avatar_url: avatarUrl,
                    firstName,
                    lastName,
                  })
                }
                disabled={loading || !hasChanges}
              >
                {loading ? "Saving..." : "Update Profile"}
              </button>
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-xs uppercase tracking-wide text-brand-secondary-2">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            className="rounded border border-brand-secondary-0 bg-brand-secondary-1 px-3 py-2 text-brand-primary-1 md:col-span-1"
            value={fullname || ""}
            onChange={(e) => setFullname(e.target.value)}
          />

          <label className="text-xs uppercase tracking-wide text-brand-secondary-2">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            className="rounded border border-brand-secondary-0 bg-brand-secondary-1 px-3 py-2 text-brand-primary-1 md:col-span-1"
            value={firstName || ""}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <label className="text-xs uppercase tracking-wide text-brand-secondary-2">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            className="rounded border border-brand-secondary-0 bg-brand-secondary-1 px-3 py-2 text-brand-primary-1 md:col-span-1"
            value={lastName || ""}
            onChange={(e) => setLastName(e.target.value)}
          />

          <label className="text-xs uppercase tracking-wide text-brand-secondary-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            className="rounded border border-brand-secondary-0 bg-brand-secondary-1 px-3 py-2 text-brand-primary-1 md:col-span-1"
            value={username || ""}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label className="text-xs uppercase tracking-wide text-brand-secondary-2 md:col-span-2">
            Website
          </label>
          <input
            id="website"
            type="url"
            className="rounded border border-brand-secondary-0 bg-brand-secondary-1 px-3 py-2 text-brand-primary-1 md:col-span-2"
            value={website || ""}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
      </div>
    </AccordionCard>
  );
}
