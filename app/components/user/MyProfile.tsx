"use client";

import Avatar from "@/app/components/ui/avatar";
import { useUser } from "@/app/hooks/useUser";
import React, { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/utils/supabase/client";
import AccordionCard from "@/app/components/user/AccordionCard";

export default function MyProfile({ defaultOpen = false }: { defaultOpen?: boolean }) {
    const { user, refreshUser } = useUser();
    const supabase = getSupabaseClient();
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
            const payload = {
                id: user.id,
                full_name: fullname,
                first_name: firstName,
                last_name: lastName,
                username,
                website,
                avatar_url,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from("profiles")
                .upsert(payload)
                .select()
                .single();
            if (error) throw error;
            await refreshUser();
            alert("Profile updated!");
        } catch (error) {
            alert("Error updating the data: " + JSON.stringify(error));
        } finally {
            setLoading(false);
        }
    }

    async function updateAvatarUrl(url: string | null) {
        if (!user) return;
        try {
            setLoading(true);
            const { error } = await supabase
                .from("profiles")
                .update({ avatar_url: url, updated_at: new Date().toISOString() })
                .eq("id", user.id);
            if (error) throw error;
            await refreshUser();
        } catch (error) {
            console.error("Error updating avatar:", error);
            alert("Error updating avatar");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AccordionCard title="My Profile" defaultOpen={open} onToggle={setOpen}>
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-shrink-0">
                    <Avatar
                        uid={user?.id ?? null}
                        url={avatarUrl}
                        size={180}
                        onUpload={(url) => {
                            setAvatarUrl(url);
                            updateAvatarUrl(url);
                        }}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                    <label className="flex items-center gap-2 text-sm">
                        <span className="whitespace-nowrap text-gray-300">Full Name</span>
                        <input
                            id="fullName"
                            type="text"
                            className="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white"
                            value={fullname || ""}
                            onChange={(e) => setFullname(e.target.value)}
                        />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <span className="whitespace-nowrap text-gray-300">First Name</span>
                        <input
                            id="firstName"
                            type="text"
                            className="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white"
                            value={firstName || ""}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <span className="whitespace-nowrap text-gray-300">Last Name</span>
                        <input
                            id="lastName"
                            type="text"
                            className="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white"
                            value={lastName || ""}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <span className="whitespace-nowrap text-gray-300">Username</span>
                        <input
                            id="username"
                            type="text"
                            className="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white"
                            value={username || ""}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </label>
                    <label className="flex items-center gap-2 text-sm md:col-span-2">
                        <span className="whitespace-nowrap text-gray-300">Website</span>
                        <input
                            id="website"
                            type="url"
                            className="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white"
                            value={website || ""}
                            onChange={(e) => setWebsite(e.target.value)}
                        />
                    </label>
                    <div className="md:col-span-2">
                        <button
                            className="button primary block w-full md:w-auto disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-500"
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
                            {loading ? "Loading ..." : "Update"}
                        </button>
                    </div>
                </div>
            </div>
        </AccordionCard>
    );
}
