"use client";
import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/utils/supabase/client";
import Avatar from "./ui/avatar";
import { Profile } from "@/app/lib/types";
import MyDistricts from "@/app/components/user/MyDistricts";
import MyBusinesses from "@/app/components/user/MyBusinesses";
import MyNonprofits from "@/app/components/user/MyNonprofits";

export default function AccountForm({ user }: { user: Profile | null }) {
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(false);
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
      // avatar upload triggers its own save; exclude avatarUrl here
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
    try {
      setLoading(true);
      const payload = {
        id: user?.id as string,
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
        // .upsert(payload, { onConflict: "id" })
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
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
    } catch (error) {
      console.error("Error updating avatar:", error);
      alert("Error updating avatar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-initial place-self-center mt-12 w-64">
      <div className="form-widget">
        <Avatar
          uid={user?.id ?? null}
          url={avatarUrl}
          size={256}
          onUpload={(url) => {
            setAvatarUrl(url);
            updateAvatarUrl(url);
          }}
        />

        <div className="form-widget">
          {/* ... */}

          <div>
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              value={fullname || ""}
              onChange={(e) => setFullname(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              value={firstName || ""}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              value={lastName || ""}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username || ""}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="url"
              value={website || ""}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div>
            <button
              className="button primary block disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-500"
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
          <MyDistricts />
          <MyBusinesses />
          <MyNonprofits />

          <div>
            <form action="/auth/signout" method="post">
              <button className="button block" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
