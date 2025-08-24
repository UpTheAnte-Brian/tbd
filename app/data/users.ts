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
        email: u.email,
        full_name: u.full_name,
        updated_at: u.updated_at,
        district_users: u.district_users,
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
        email: data.email,
        full_name: data.full_name,
        updated_at: data.updated_at,
        district_users: data.district_users,
    };
    return user;
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
