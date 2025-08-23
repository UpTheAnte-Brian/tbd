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

export interface District {
    id: string;
    sdorgid: string;
    shortname: string;
}

export interface UserWithDistricts {
    id: string;
    full_name: string;
    districts: District[];
}

// type for each district_user row returned by Supabase
// each district_user row
interface DistrictUserRow {
    districts: District | District[]; // single object or array
}

// profile row returned from Supabase
interface ProfileRow {
    id: string;
    full_name: string;
    district_users: DistrictUserRow[];
}

export async function getAllUsers(): Promise<UserWithDistricts[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("profiles")
        .select(`
      id,
      full_name,
      district_users (
        districts (
          id,
          sdorgid,
          shortname
        )
      )
    `);

    if (error) throw error;

    return data.map((u: ProfileRow) => ({
        id: u.id,
        full_name: u.full_name,
        districts: u.district_users.flatMap((du: DistrictUserRow) => {
            const districtsArray = Array.isArray(du.districts)
                ? du.districts
                : [du.districts];
            return districtsArray.map((d: District) => ({
                id: d.id,
                sdorgid: d.sdorgid,
                shortname: d.shortname,
            }));
        }),
    }));
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
