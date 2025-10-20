// import 'server-only'
// import { getCurrentUser } from './auth'

// function canSeeUsername(viewer: User) {
//   // Public info for now, but can change
//   return true
// }

// function canSeePhoneNumber(viewer: User, team: string) {
//   // Privacy rules
//   return viewer.isAdmin || team === viewer.team
// }
import { Profile } from "@/app/lib/types";
import { createClient } from "@/utils/supabase/server";

export async function getAllUsers(): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(`
    *,
    district_users (
      role,
      district_id,
      user_id,
      district:districts ( id, sdorgid, shortname )
    ),
    business_users (
      role,
      business_id,
      user_id,
      business:businesses ( id, place_id, name )
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
    district_users: u.district_users,
    business_users: u.business_users,
    global_role: u.role ?? null,
  }));
}

export async function getUser(id: string): Promise<Profile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      *,
    district_users (
      role,
      district_id,
      user_id,
      district:districts ( id, sdorgid, shortname )
    ),
    business_users (
      role,
      business_id,
      user_id,
      business:businesses ( id, place_id, name )
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
    district_users: data.district_users,
    business_users: data.business_users,
    global_role: data.role ?? null,
  };
  return user;
}

export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  return await getUser(user.id); // reuse existing getUser(id)
}

export async function assignUserToDistrict(userId: string, districtId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("district_users").upsert({
    user_id: userId,
    district_id: districtId,
    role: "board_member",
  }, {
    onConflict: "district_id,user_id", // 👈 use your unique key here
  });
  if (error) throw error;
  return { success: true };
}
