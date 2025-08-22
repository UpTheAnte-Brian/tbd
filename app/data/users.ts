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
import { createClient } from "@/utils/supabase/server";

export async function getAllUsers() {
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) throw error;
    return data;
}

export async function assignUserToDistrict(userId: string, districtId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("district_users").upsert({
        user_id: userId,
        district_id: districtId,
        role: "board_member",
    });
    if (error) throw error;
    return { success: true };
}
