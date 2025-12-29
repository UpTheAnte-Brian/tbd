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
import { EntityUser, EntityUserRole, Profile } from "@/app/lib/types/types";
import { createClient } from "@/utils/supabase/server";

type EntityUserRow = {
  id: string;
  entity_id: string;
  user_id: string;
  role: EntityUserRole;
  status?: EntityUser["status"];
  created_at?: string | null;
  entities?:
    | { entity_type?: EntityUser["entity_type"] | null }[]
    | { entity_type?: EntityUser["entity_type"] | null }
    | null;
};

const mapEntityUsers = (
  rows: EntityUserRow[] | null | undefined,
): EntityUser[] =>
  (rows ?? []).map((eu) => {
    const entity = Array.isArray(eu.entities) ? eu.entities[0] : eu.entities;
    return {
      id: String(eu.id),
      entity_id: String(eu.entity_id),
      user_id: String(eu.user_id),
      role: (eu.role as EntityUserRole) ?? "viewer",
      status: (eu.status as EntityUser["status"]) ?? null,
      created_at: eu.created_at ?? null,
      updated_at: null,
      entity_type: entity?.entity_type ?? undefined,
    };
  });

export async function getAllUsers(): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(`
    *,
    entity_users:entity_users (
      id,
      entity_id,
      user_id,
      role,
      status,
      created_at,
      entities:entities (
        entity_type
      )
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
    entity_users: mapEntityUsers(u.entity_users as EntityUserRow[] | null),
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
      entity_id,
      user_id,
      role,
      status,
      created_at,
      entities:entities (
        entity_type
      )
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
    entity_users: mapEntityUsers(data.entity_users as EntityUserRow[] | null),
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
  const { data: existing, error: existingError } = await supabase
    .from("entity_users")
    .select("id")
    .eq("entity_id", districtId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing?.id) {
    const { error } = await supabase
      .from("entity_users")
      .update({ role: "admin" })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("entity_users").insert({
      user_id: userId,
      entity_id: districtId,
      role: "admin",
    });
    if (error) throw error;
  }
  return { success: true };
}
