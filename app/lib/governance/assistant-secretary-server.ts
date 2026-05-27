import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import { createApiClient } from "@/utils/supabase/route";
import { supabaseAdmin } from "@/utils/supabase/service-worker";

type GovernanceTables = Database["governance"]["Tables"];

type SessionClient = SupabaseClient<Database>;

type PgLikeError = {
    message?: string | null;
    code?: string | null;
    details?: string | null;
    hint?: string | null;
};

export class AssistantSecretaryRouteError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

export type MeetingAccess = {
    userId: string;
    meetingId: string;
    boardId: string;
    entityId: string;
    sessionClient: SessionClient;
};

function formatPgError(context: string, error: PgLikeError): string {
    const base = (error.message ?? "").trim() || "Unknown database error";
    const suffix: string[] = [];
    if (error.code) suffix.push(`code=${error.code}`);
    if (error.details) suffix.push(`details=${error.details}`);
    if (error.hint) suffix.push(`hint=${error.hint}`);
    return suffix.length > 0
        ? `${context}: ${base} (${suffix.join("; ")})`
        : `${context}: ${base}`;
}

function isMissingRelation(error: PgLikeError): boolean {
    if (error.code === "42P01") return true;
    const message = (error.message ?? "").toLowerCase();
    return message.includes("does not exist") && message.includes("relation");
}

export async function requireMeetingWriteAccess(
    meetingId: string,
): Promise<MeetingAccess> {
    const sessionClient = await createApiClient();
    const {
        data: { user },
        error: userError,
    } = await sessionClient.auth.getUser();
    if (userError || !user?.id) {
        throw new AssistantSecretaryRouteError("Unauthorized", 401);
    }

    const { data: meeting, error: meetingError } = await supabaseAdmin
        .schema("governance")
        .from("board_meetings")
        .select("id, board_id, board:boards(entity_id)")
        .eq("id", meetingId)
        .maybeSingle();

    if (meetingError) {
        console.error(
            "[assistant-secretary] meeting lookup error",
            meetingError,
        );
        throw new AssistantSecretaryRouteError(
            formatPgError("Meeting lookup failed", meetingError),
            400,
        );
    }
    if (!meeting?.id || !meeting.board_id) {
        throw new AssistantSecretaryRouteError("Meeting not found", 404);
    }

    const board = meeting.board as { entity_id?: string | null } | null;
    const entityId = board?.entity_id ?? null;
    if (!entityId) {
        throw new AssistantSecretaryRouteError("Meeting entity not found", 404);
    }

    const { data: profileRow, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
    if (profileError) {
        console.error(
            "[assistant-secretary] profile lookup error",
            profileError,
        );
        throw new AssistantSecretaryRouteError(
            formatPgError("Authorization check failed (global admin)", profileError),
            400,
        );
    }
    const globalAdmin = profileRow?.role === "admin";

    const { data: entityUserRow, error: entityUserError } = await supabaseAdmin
        .from("entity_users")
        .select("role, status")
        .eq("entity_id", entityId)
        .eq("user_id", user.id)
        .maybeSingle();
    if (entityUserError) {
        console.error(
            "[assistant-secretary] entity_users lookup error",
            entityUserError,
        );
        throw new AssistantSecretaryRouteError(
            formatPgError(
                "Authorization check failed (entity admin)",
                entityUserError,
            ),
            400,
        );
    }
    const entityAdmin = entityUserRow?.role === "admin" &&
        (entityUserRow?.status === "active" || entityUserRow?.status === "invited");

    const { data: boardMemberRows, error: boardMemberError } = await supabaseAdmin
        .schema("governance")
        .from("board_members")
        .select("role, term_start, term_end")
        .eq("board_id", meeting.board_id)
        .eq("user_id", user.id)
        .eq("status", "active");
    if (boardMemberError) {
        console.error(
            "[assistant-secretary] board_members access error",
            boardMemberError,
        );
        throw new AssistantSecretaryRouteError(
            formatPgError(
                "Authorization check failed (board members)",
                boardMemberError,
            ),
            400,
        );
    }

    const today = new Date().toISOString().slice(0, 10);
    const activeRows = (boardMemberRows ?? []).filter((row) => {
        const termStart = row.term_start?.slice(0, 10) ?? null;
        const termEnd = row.term_end?.slice(0, 10) ?? null;
        return Boolean(
            termStart && termStart <= today && (!termEnd || termEnd >= today),
        );
    });

    const boardMember = activeRows.length > 0;
    const boardOfficer = activeRows.some((row) => row.role !== "member");

    const canWrite = Boolean(
        globalAdmin || entityAdmin || boardMember || boardOfficer,
    );
    if (!canWrite) {
        throw new AssistantSecretaryRouteError("Not authorized", 403);
    }

    return {
        userId: user.id,
        meetingId,
        boardId: meeting.board_id,
        entityId,
        sessionClient,
    };
}

export async function getMeetingTranscript(
    meetingId: string,
): Promise<GovernanceTables["meeting_transcripts"]["Row"] | null> {
    const { data, error } = await supabaseAdmin
        .schema("governance")
        .from("meeting_transcripts")
        .select("*")
        .eq("meeting_id", meetingId)
        .maybeSingle();
    if (error) {
        if (isMissingRelation(error)) {
            return null;
        }
        throw new AssistantSecretaryRouteError(
            formatPgError("Failed to load transcript", error),
            400,
        );
    }
    return data;
}

export async function upsertMeetingTranscript(params: {
    meetingId: string;
    transcript: string;
    userId: string;
}): Promise<GovernanceTables["meeting_transcripts"]["Row"]> {
    const payload: GovernanceTables["meeting_transcripts"]["Insert"] = {
        meeting_id: params.meetingId,
        transcript: params.transcript,
        created_by: params.userId,
    };

    const { data, error } = await supabaseAdmin
        .schema("governance")
        .from("meeting_transcripts")
        .upsert(
            {
                ...payload,
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: "meeting_id",
            },
        )
        .select("*")
        .single();

    if (error) {
        if (isMissingRelation(error)) {
            return {
                id: randomUUID(),
                meeting_id: params.meetingId,
                transcript: params.transcript,
                created_by: params.userId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            } as GovernanceTables["meeting_transcripts"]["Row"];
        }
        throw new AssistantSecretaryRouteError(
            formatPgError("Failed to save transcript", error),
            400,
        );
    }
    return data;
}
