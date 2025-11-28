import "server-only";
import { createClient } from "@/utils/supabase/server";

export interface NonprofitUserDTO {
    id: string;
    nonprofit_id: string;
    user_id: string;
    role: string;
    board_role: string | null;
    created_at: string;
    created_by: string | null;
    profiles?: {
        id: string;
        full_name: string | null;
    };
}

/**
 * Used for inserts and updates
 */
export interface NonprofitUserInput {
    nonprofit_id?: string;
    user_id?: string;
    role?: string;
    board_role?: string | null;
}

/**
 * Fetch all nonprofit-user assignments.
 */
export async function listNonprofitUsersDTO(): Promise<NonprofitUserDTO[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nonprofit_users")
        .select(
            `
      id,
      nonprofit_id,
      user_id,
      role,
      board_role,
      created_at,
      created_by,
      profiles:user_id (
        id,
        full_name
      )
    `,
        )
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data as unknown as NonprofitUserDTO[];
}

/**
 * Get a single nonprofit-user assignment by ID.
 */
export async function getNonprofitUserDTO(
    id: string,
): Promise<NonprofitUserDTO | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nonprofit_users")
        .select(
            `
      id,
      nonprofit_id,
      user_id,
      role,
      board_role,
      created_at,
      created_by,
      profiles:user_id (
        id,
        full_name
      )
    `,
        )
        .eq("id", id)
        .single();

    if (error) throw error;
    return data as unknown as NonprofitUserDTO;
}

/**
 * Create a new nonprofit-user assignment.
 */
export async function createNonprofitUserDTO(
    input: NonprofitUserInput,
): Promise<NonprofitUserDTO> {
    if (!input.nonprofit_id || !input.user_id) {
        throw new Error("nonprofit_id and user_id are required");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nonprofit_users")
        .insert({
            nonprofit_id: input.nonprofit_id,
            user_id: input.user_id,
            role: input.role ?? "viewer",
            board_role: input.board_role ?? null,
        })
        .select(
            `
      id,
      nonprofit_id,
      user_id,
      role,
      board_role,
      created_at,
      created_by,
      profiles:user_id (
        id,
        full_name
      )
    `,
        )
        .single();

    if (error) throw error;
    return data as unknown as NonprofitUserDTO;
}

/**
 * Update nonprofit-user assignment (role, board_role)
 */
export async function updateNonprofitUserDTO(
    id: string,
    input: NonprofitUserInput,
): Promise<NonprofitUserDTO> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nonprofit_users")
        .update({
            role: input.role ?? undefined,
            board_role: input.board_role ?? undefined,
        })
        .eq("id", id)
        .select(
            `
      id,
      nonprofit_id,
      user_id,
      role,
      board_role,
      created_at,
      created_by,
      profiles:user_id (
        id,
        full_name
      )
    `,
        )
        .single();

    if (error) throw error;
    return data as unknown as NonprofitUserDTO;
}

/**
 * Delete a nonprofit-user assignment.
 */
export async function deleteNonprofitUserDTO(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("nonprofit_users").delete().eq(
        "id",
        id,
    );
    if (error) throw error;
}
