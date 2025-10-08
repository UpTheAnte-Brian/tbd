"use client";
import { useState } from "react";
import { getSupabaseClient } from "@/utils/supabase/client";
import Avatar from "./ui/avatar";
import { Profile } from "@/app/lib/types";
import { useUser } from "@/app/hooks/useUser";

export default function AccountForm({ user }: { user: Profile | null }) {
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [fullname, setFullname] = useState<string>(user?.full_name || "");
  const [firstName, setFirstName] = useState<string | null>(
    user?.first_name || ""
  );
  const [lastName, setLastName] = useState<string | null>(
    user?.last_name || ""
  );
  const [username, setUsername] = useState<string | null>(user?.username || "");
  const [website, setWebsite] = useState<string | null>(user?.website || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.avatar_url || ""
  );
  const { claimedBusinesses } = useUser();
  console.log("claimedBusinesses: ", claimedBusinesses);

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

  return (
    <div className="flex-initial place-self-center mt-12 w-64">
      <div className="form-widget">
        <Avatar
          uid={user?.id ?? null}
          url={avatarUrl}
          size={256}
          onUpload={(url) => {
            setAvatarUrl(url);
            updateProfile({
              username,
              fullname,
              website,
              avatar_url: url,
              firstName,
              lastName,
            });
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
              className="button primary block"
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
              disabled={loading}
            >
              {loading ? "Loading ..." : "Update"}
            </button>
          </div>

          <div>
            <form action="/auth/signout" method="post">
              <button className="button block" type="submit">
                Sign out
              </button>
            </form>
          </div>

          <div>
            {claimedBusinesses?.map((b) => (
              <div
                key={b.id}
                className="border border-blue-600 bg-blue-50 text-black"
              >
                {b.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
