import "server-only";
// import { getCurrentUser } from './auth'

// function canSeeUsername(viewer: User) {
//   // Public info for now, but can change
//   return true
// }

// function canSeePhoneNumber(viewer: User, team: string) {
//   // Privacy rules
//   return viewer.isAdmin || team === viewer.team
// }
import { getCurrentUser } from "@/app/data/auth";
import { Profile } from "@/app/lib/types/types";
import { createClient } from "@/utils/supabase/server";

export async function getAllUsers(): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(`
    *,
    entity_users:entity_users (
      id,
      entity_type,
      entity_id,
      user_id,
      role,
      status,
      created_at
    )
  `);

  if (error) throw error;

  return data.map((u) => ({
    id: u.id,
    first_name: u.first_name,
    last_name: u.last_name,
    website: u.website,
    username: u.username,
    avatar_url: u.avatar_url,
    full_name: u.full_name,
    updated_at: u.updated_at,
    entity_users: u.entity_users ?? [],
    global_role: u.role ?? null,
    address: u.address ?? null,
    phone_number: u.phone_number ?? null,
  }));
}

export async function getUser(id: string): Promise<Profile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      *,
      entity_users:entity_users (
        id,
      entity_type,
      entity_id,
      user_id,
      role,
      status,
      created_at
    )
  `)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) throw error;

  const user = {
    id: data.id,
    first_name: data.first_name,
    last_name: data.last_name,
    website: data.website,
    username: data.username,
    avatar_url: data.avatar_url,
    full_name: data.full_name,
    updated_at: data.updated_at,
    entity_users: data.entity_users ?? [],
    global_role: data.role ?? null,
    address: data.address ?? null,
    phone_number: data.phone_number ?? null,
  };
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();

  if (!user) return null;

  return await getUser(user.id); // reuse existing getUser(id)
}

export async function assignUserToDistrict(userId: string, districtId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("entity_users").upsert({
    user_id: userId,
    entity_id: districtId,
    entity_type: "district",
    role: "admin",
  }, {
    onConflict: "entity_id,user_id,entity_type",
  });
  if (error) throw error;
  return { success: true };
}
