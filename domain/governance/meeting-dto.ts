import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import { createApiClient } from "@/utils/supabase/route";
import {
    MEETING_STATUS,
    type MeetingStatus,
    MINUTES_STATUS,
    type MinutesStatus,
    MOTION_STATUS,
    type MotionStatus,
    type VoteValue,
} from "@/domain/governance/constants";

type GovernanceTables = Database["governance"]["Tables"];

type ExtendedGovernanceTables = GovernanceTables & {
    board_meetings: {
        Row: GovernanceTables["board_meetings"]["Row"] & {
            started_at?: string | null;
            adjourned_at?: string | null;
            presiding_user_id?: string | null;
            called_by_user_id?: string | null;
        };
        Insert: GovernanceTables["board_meetings"]["Insert"] & {
            started_at?: string | null;
            adjourned_at?: string | null;
            presiding_user_id?: string | null;
            called_by_user_id?: string | null;
        };
        Update: GovernanceTables["board_meetings"]["Update"] & {
            started_at?: string | null;
            adjourned_at?: string | null;
            presiding_user_id?: string | null;
            called_by_user_id?: string | null;
        };
        Relationships: GovernanceTables["board_meetings"]["Relationships"];
    };
    motions: {
        Row: GovernanceTables["motions"]["Row"] & {
            board_id?: string | null;
            entity_id?: string | null;
        };
        Insert: GovernanceTables["motions"]["Insert"] & {
            board_id?: string | null;
            entity_id?: string | null;
        };
        Update: GovernanceTables["motions"]["Update"] & {
            board_id?: string | null;
            entity_id?: string | null;
        };
        Relationships: GovernanceTables["motions"]["Relationships"];
    };
    votes: {
        Row: GovernanceTables["votes"]["Row"] & {
            user_id?: string | null;
            value?: string | null;
            created_at?: string | null;
            updated_at?: string | null;
        };
        Insert: GovernanceTables["votes"]["Insert"] & {
            user_id?: string | null;
            value?: string | null;
        };
        Update: GovernanceTables["votes"]["Update"] & {
            user_id?: string | null;
            value?: string | null;
        };
        Relationships: GovernanceTables["votes"]["Relationships"];
    };
    meeting_minutes: {
        Row: GovernanceTables["meeting_minutes"]["Row"] & {
            entity_id?: string | null;
            status?: string | null;
            content_md?: string | null;
            content_json?: unknown | null;
            created_at?: string | null;
            finalized_at?: string | null;
            locked_at?: string | null;
            amended_from_minutes_id?: string | null;
            version?: number | null;
            finalized_by_user_id?: string | null;
        };
        Insert: GovernanceTables["meeting_minutes"]["Insert"] & {
            entity_id?: string | null;
            status?: string | null;
            content_md?: string | null;
            content_json?: unknown | null;
            created_at?: string | null;
            finalized_at?: string | null;
            locked_at?: string | null;
            amended_from_minutes_id?: string | null;
            version?: number | null;
            finalized_by_user_id?: string | null;
        };
        Update: GovernanceTables["meeting_minutes"]["Update"] & {
            entity_id?: string | null;
            status?: string | null;
            content_md?: string | null;
            content_json?: unknown | null;
            created_at?: string | null;
            finalized_at?: string | null;
            locked_at?: string | null;
            amended_from_minutes_id?: string | null;
            version?: number | null;
            finalized_by_user_id?: string | null;
        };
        Relationships: GovernanceTables["meeting_minutes"]["Relationships"];
    };
};

type GovernanceDatabase = Omit<Database, "governance"> & {
    governance: {
        Tables: ExtendedGovernanceTables;
        Views: Database["governance"]["Views"];
        Functions: Database["governance"]["Functions"];
        Enums: Database["governance"]["Enums"];
        CompositeTypes: Database["governance"]["CompositeTypes"];
    };
};

type RawRecord = Record<string, unknown>;

type MeetingRecord = {
    id: string;
    board_id: string;
    entity_id: string;
    title: string | null;
    status: MeetingStatus;
    scheduled_at: string | null;
    started_at: string | null;
    adjourned_at: string | null;
    finalized_at: string | null;
    presiding_user_id: string | null;
    created_at: string | null;
};

type MotionRecord = {
    id: string;
    meeting_id: string;
    entity_id: string;
    title: string;
    status: MotionStatus;
    created_at: string;
    finalized_at: string | null;
};

type VoteRecord = {
    id: string;
    motion_id: string;
    user_id: string | null;
    value: string;
    created_at: string | null;
    updated_at: string | null;
};

type MinutesRecord = {
    id: string;
    meeting_id: string;
    entity_id: string;
    status: MinutesStatus;
    content_md: string | null;
    created_at: string | null;
    finalized_at: string | null;
    amended_from_minutes_id: string | null;
};

type MinutesExpandedRecord = {
    id: string;
    meeting_id: string;
    status: MinutesStatus;
    content_md: string | null;
    content_json: unknown | null;
    created_at: string | null;
    finalized_at: string | null;
    locked_at: string | null;
};

type PermissionsRecord = {
    isBoardMember: boolean;
    isBoardOfficer: boolean;
};

async function getGovernanceClient(): Promise<
    SupabaseClient<GovernanceDatabase>
> {
    return (await createApiClient()) as SupabaseClient<GovernanceDatabase>;
}

function mapMeeting(row: RawRecord, entityId: string): MeetingRecord {
    const scheduledAt = (row.scheduled_at as string | null | undefined) ??
        (row.scheduled_start as string | null | undefined) ??
        null;
    return {
        id: String(row.id),
        board_id: String(row.board_id),
        entity_id: entityId,
        title: (row.title as string | null | undefined) ?? null,
        status: (row.status as MeetingStatus | null | undefined) ??
            MEETING_STATUS.SCHEDULED,
        scheduled_at: scheduledAt,
        started_at: (row.started_at as string | null | undefined) ?? null,
        adjourned_at: (row.adjourned_at as string | null | undefined) ?? null,
        finalized_at: (row.finalized_at as string | null | undefined) ?? null,
        presiding_user_id:
            (row.presiding_user_id as string | null | undefined) ??
                null,
        created_at: (row.created_at as string | null | undefined) ?? null,
    };
}

function mapMotion(row: RawRecord, entityId: string): MotionRecord {
    return {
        id: String(row.id),
        meeting_id: String(row.meeting_id),
        entity_id: entityId,
        title: (row.title as string | null | undefined) ?? "",
        status: (row.status as MotionStatus | null | undefined) ??
            MOTION_STATUS.PENDING,
        created_at: (row.created_at as string | null | undefined) ?? "",
        finalized_at: (row.finalized_at as string | null | undefined) ?? null,
    };
}

function mapMinutes(row: RawRecord, entityId: string): MinutesRecord {
    const status = (row.status as MinutesStatus | null | undefined) ??
        ((row.draft as boolean | null | undefined) === false
            ? MINUTES_STATUS.FINALIZED
            : MINUTES_STATUS.DRAFT);
    const contentMd = (row.content_md as string | null | undefined) ??
        (row.content as string | null | undefined) ??
        null;
    const finalizedAt = (row.finalized_at as string | null | undefined) ??
        (row.approved_at as string | null | undefined) ??
        null;
    return {
        id: String(row.id),
        meeting_id: String(row.meeting_id),
        entity_id: entityId,
        status,
        content_md: contentMd,
        created_at: (row.created_at as string | null | undefined) ?? null,
        finalized_at: finalizedAt,
        amended_from_minutes_id:
            (row.amended_from_minutes_id as string | null | undefined) ?? null,
    };
}

function mapMinutesExpanded(row: RawRecord): MinutesExpandedRecord {
    const status = (row.status as MinutesStatus | null | undefined) ??
        ((row.draft as boolean | null | undefined) === false
            ? MINUTES_STATUS.FINALIZED
            : MINUTES_STATUS.DRAFT);
    const contentMd = (row.content_md as string | null | undefined) ??
        (row.content as string | null | undefined) ??
        null;
    const finalizedAt = (row.finalized_at as string | null | undefined) ??
        (row.approved_at as string | null | undefined) ??
        null;
    const contentJson: unknown | null = row["content_json"] ?? null;
    return {
        id: String(row.id),
        meeting_id: String(row.meeting_id),
        status,
        content_md: contentMd,
        content_json: contentJson,
        created_at: (row.created_at as string | null | undefined) ?? null,
        finalized_at: finalizedAt,
        locked_at: (row.locked_at as string | null | undefined) ?? null,
    };
}

function mapVote(
    row: RawRecord,
    fallbackUserId: string | null,
): VoteRecord {
    const value = (row.value as string | null | undefined) ??
        (row.vote as string | null | undefined) ??
        "abstain";
    return {
        id: String(row.id),
        motion_id: String(row.motion_id),
        user_id: (row.user_id as string | null | undefined) ?? fallbackUserId ??
            null,
        value,
        created_at: (row.created_at as string | null | undefined) ??
            (row.signed_at as string | null | undefined) ??
            null,
        updated_at: (row.updated_at as string | null | undefined) ?? null,
    };
}

async function getMeetingRowForEntity(
    supabase: SupabaseClient<GovernanceDatabase>,
    entityId: string,
    meetingId: string,
): Promise<{ row: RawRecord; boardId: string } | null> {
    const { data, error } = await supabase
        .schema("governance")
        .from("board_meetings")
        .select("*, board:boards(entity_id)")
        .eq("id", meetingId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const row = data as RawRecord;
    const board = row.board as RawRecord | null | undefined;
    const boardEntityId = board && typeof board === "object"
        ? (board.entity_id as string | null | undefined)
        : null;
    if (!boardEntityId || boardEntityId !== entityId) return null;

    const boardId = row.board_id ? String(row.board_id) : "";
    if (!boardId) return null;

    return { row, boardId };
}

async function getMeetingForMotion(
    supabase: SupabaseClient<GovernanceDatabase>,
    entityId: string,
    motionId: string,
): Promise<{ meeting: MeetingRecord; boardId: string }> {
    const { data, error } = await supabase
        .schema("governance")
        .from("motions")
        .select("*")
        .eq("id", motionId)
        .maybeSingle();

    if (error) throw error;
    if (!data) {
        throw new Error("Motion not found");
    }

    const row = data as RawRecord;
    const meetingId = (row.meeting_id as string | null | undefined) ?? null;
    if (!meetingId) {
        throw new Error("Motion missing meeting");
    }

    const meetingInfo = await getMeetingRowForEntity(
        supabase,
        entityId,
        meetingId,
    );
    if (!meetingInfo) {
        throw new Error("Meeting not found");
    }

    return {
        meeting: mapMeeting(meetingInfo.row, entityId),
        boardId: meetingInfo.boardId,
    };
}

async function getBoardMemberId(
    supabase: SupabaseClient<GovernanceDatabase>,
    boardId: string,
    userId: string,
): Promise<string> {
    const { data, error } = await supabase
        .schema("governance")
        .from("board_members")
        .select("id")
        .eq("board_id", boardId)
        .eq("user_id", userId)
        .maybeSingle();

    if (error) throw error;
    if (!data?.id) {
        throw new Error("Board member not found");
    }
    return String(data.id);
}

export async function getMeetingDetail(
    entityId: string,
    meetingId: string,
): Promise<{ meeting: MeetingRecord; permissions: PermissionsRecord }> {
    const supabase = await getGovernanceClient();
    const meetingInfo = await getMeetingRowForEntity(
        supabase,
        entityId,
        meetingId,
    );
    if (!meetingInfo) {
        throw new Error("Meeting not found");
    }

    const meeting = mapMeeting(meetingInfo.row, entityId);

    const { data: isBoardMember, error: memberError } = await supabase
        .schema("governance")
        // NOTE: typed Database Functions may lag behind; keep RPC names stable.
        .rpc(
            "is_board_member_current" as never,
            { p_board_id: meeting.board_id } as never,
        );
    if (memberError) throw memberError;

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) {
        throw new Error("Not authenticated");
    }

    const { data: isBoardOfficer, error: officerError } = await supabase
        .schema("governance")
        .rpc(
            "is_board_officer" as never,
            { p_board_id: meeting.board_id, p_user_id: auth.user.id } as never,
        );
    if (officerError) throw officerError;

    return {
        meeting,
        permissions: {
            isBoardMember: Boolean(isBoardMember),
            isBoardOfficer: Boolean(isBoardOfficer),
        },
    };
}

export async function startMeeting(
    entityId: string,
    meetingId: string,
): Promise<MeetingRecord> {
    const supabase = await getGovernanceClient();
    const meetingInfo = await getMeetingRowForEntity(
        supabase,
        entityId,
        meetingId,
    );
    if (!meetingInfo) {
        throw new Error("Meeting not found");
    }

    const { data, error } = await supabase
        .schema("governance")
        .from("board_meetings")
        .update({
            status: MEETING_STATUS.IN_SESSION,
            started_at: new Date().toISOString(),
        })
        .eq("id", meetingId)
        .eq("board_id", meetingInfo.boardId)
        .select("*")
        .single();

    if (error) throw error;
    return mapMeeting(data as RawRecord, entityId);
}

export async function adjournMeeting(
    entityId: string,
    meetingId: string,
): Promise<MeetingRecord> {
    const supabase = await getGovernanceClient();
    const meetingInfo = await getMeetingRowForEntity(
        supabase,
        entityId,
        meetingId,
    );
    if (!meetingInfo) {
        throw new Error("Meeting not found");
    }

    const { data, error } = await supabase
        .schema("governance")
        .from("board_meetings")
        .update({
            status: MEETING_STATUS.ADJOURNED,
            adjourned_at: new Date().toISOString(),
        })
        .eq("id", meetingId)
        .eq("board_id", meetingInfo.boardId)
        .select("*")
        .single();

    if (error) throw error;
    return mapMeeting(data as RawRecord, entityId);
}

export async function finalizeMeeting(
    entityId: string,
    meetingId: string,
    signatureHash?: string | null,
): Promise<MeetingRecord> {
    const supabase = await getGovernanceClient();
    const meetingInfo = await getMeetingRowForEntity(
        supabase,
        entityId,
        meetingId,
    );
    if (!meetingInfo) {
        throw new Error("Meeting not found");
    }

    const { data, error } = await supabase
        .schema("governance")
        // NOTE: typed Database Functions may lag behind; keep RPC names stable.
        .rpc(
            "finalize_meeting" as never,
            {
                p_meeting_id: meetingId,
                p_signature_hash: signatureHash ?? null,
            } as never,
        );

    if (error) throw error;
    if (!data) {
        throw new Error("Finalize meeting failed");
    }
    return mapMeeting(data as RawRecord, entityId);
}

export async function listMeetingMotions(
    entityId: string,
    meetingId: string,
): Promise<MotionRecord[]> {
    const supabase = await getGovernanceClient();
    const meetingInfo = await getMeetingRowForEntity(
        supabase,
        entityId,
        meetingId,
    );
    if (!meetingInfo) {
        throw new Error("Meeting not found");
    }

    const { data, error } = await supabase
        .schema("governance")
        .from("motions")
        .select("id, meeting_id, title, status, created_at, finalized_at")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row) => mapMotion(row as RawRecord, entityId));
}

export async function createMeetingMotion(
    entityId: string,
    meetingId: string,
    title: string,
): Promise<MotionRecord> {
    const supabase = await getGovernanceClient();
    const meetingInfo = await getMeetingRowForEntity(
        supabase,
        entityId,
        meetingId,
    );
    if (!meetingInfo) {
        throw new Error("Meeting not found");
    }

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) {
        throw new Error("Not authenticated");
    }

    // Different environments have slightly different column sets for `motions`.
    // Build a permissive payload and cast via `unknown` to avoid TS drift.
    const payload = {
        meeting_id: meetingId,
        title,
        status: MOTION_STATUS.PENDING,
        // Common/optional fields (present in some envs)
        entity_id: entityId,
        board_id: meetingInfo.boardId,
        moved_by: auth.user.id,
        seconded_by: null,
        motion_type: "main",
        description: null,
    } satisfies Record<string, unknown>;

    const { data, error } = await supabase
        .schema("governance")
        .from("motions")
        .insert(
            payload as unknown as ExtendedGovernanceTables["motions"]["Insert"],
        )
        .select("id, meeting_id, title, status, created_at, finalized_at")
        .single();

    if (error) throw error;
    return mapMotion(data as RawRecord, entityId);
}

export async function listMotionVotes(
    entityId: string,
    motionId: string,
): Promise<VoteRecord[]> {
    const supabase = await getGovernanceClient();
    await getMeetingForMotion(supabase, entityId, motionId);

    const baseQuery = supabase
        .schema("governance")
        .from("votes")
        .select("*")
        .eq("motion_id", motionId);

    let { data, error } = await baseQuery.order("created_at", {
        ascending: true,
    });
    if (error && error.message.toLowerCase().includes("created_at")) {
        ({ data, error } = await baseQuery.order("signed_at", {
            ascending: true,
        }));
    }

    if (error) throw error;

    const rows = (data ?? []) as RawRecord[];
    const missingBoardMemberIds = new Set<string>();
    rows.forEach((row) => {
        if (row.user_id) return;
        const memberId = row.board_member_id as string | null | undefined;
        if (memberId) missingBoardMemberIds.add(memberId);
    });

    const boardMemberMap = new Map<string, string>();
    if (missingBoardMemberIds.size > 0) {
        const { data: members, error: memberError } = await supabase
            .schema("governance")
            .from("board_members")
            .select("id, user_id")
            .in("id", Array.from(missingBoardMemberIds));
        if (memberError) throw memberError;
        (members ?? []).forEach((member) => {
            if (member?.id && member?.user_id) {
                boardMemberMap.set(String(member.id), String(member.user_id));
            }
        });
    }

    return rows.map((row) => {
        const memberId = row.board_member_id as string | null | undefined;
        const fallbackUserId = memberId
            ? boardMemberMap.get(memberId) ?? null
            : null;
        return mapVote(row, fallbackUserId);
    });
}

export async function upsertMyVote(
    entityId: string,
    motionId: string,
    value: VoteValue,
): Promise<VoteRecord> {
    const supabase = await getGovernanceClient();

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) {
        throw new Error("Not authenticated");
    }

    const { boardId } = await getMeetingForMotion(
        supabase,
        entityId,
        motionId,
    );

    const boardMemberId = await getBoardMemberId(
        supabase,
        boardId,
        auth.user.id,
    );

    // Different environments store votes differently (user_id+value vs board_member_id+vote).
    // Cast through `unknown` to avoid explicit `any` lint errors.
    const votesQuery = supabase
        .schema("governance")
        .from("votes") as unknown as {
            upsert: (
                values: Record<string, unknown>,
                options: { onConflict: string },
            ) => any;
            select: (columns: string) => any;
            single: () => any;
        };

    const { data, error } = await votesQuery
        .upsert(
            {
                motion_id: motionId,
                board_member_id: boardMemberId,
                vote: value,
            },
            { onConflict: "motion_id,board_member_id" },
        )
        .select("*")
        .single();

    if (error) throw error;
    return mapVote(data as RawRecord, auth.user.id);
}

export async function listMeetingMinutes(
    entityId: string,
    meetingId: string,
): Promise<MinutesRecord[]> {
    const supabase = await getGovernanceClient();
    const meetingInfo = await getMeetingRowForEntity(
        supabase,
        entityId,
        meetingId,
    );
    if (!meetingInfo) {
        throw new Error("Meeting not found");
    }

    const minutesQuery = supabase
        .schema("governance")
        .from("meeting_minutes")
        .select("*")
        .eq("meeting_id", meetingId);

    let { data, error } = await minutesQuery.order("created_at", {
        ascending: false,
    });
    if (error && error.message.toLowerCase().includes("created_at")) {
        ({ data, error } = await minutesQuery.order("approved_at", {
            ascending: false,
        }));
    }

    if (error) throw error;
    return (data ?? []).map((row) => mapMinutes(row as RawRecord, entityId));
}

type MinutesExpandedQuery = {
    select: (columns: string) => MinutesExpandedQuery;
    eq: (column: string, value: string) => MinutesExpandedQuery;
    order: (
        column: string,
        options: { ascending: boolean },
    ) => MinutesExpandedQuery;
    limit: (
        count: number,
    ) => Promise<{ data: RawRecord[] | null; error: PostgrestError | null }>;
};

export async function getMeetingMinutesExpanded(
    entityId: string,
    meetingId: string,
): Promise<MinutesExpandedRecord | null> {
    const supabase = await getGovernanceClient();
    const meetingInfo = await getMeetingRowForEntity(
        supabase,
        entityId,
        meetingId,
    );
    if (!meetingInfo) {
        throw new Error("Meeting not found");
    }

    const columns =
        "id, meeting_id, status, content_md, content_json, created_at, finalized_at, locked_at";
    const baseQuery = () =>
        supabase
            .schema("governance")
            .from("meeting_minutes_expanded" as never)
            .select(columns)
            .eq("meeting_id", meetingId) as unknown as MinutesExpandedQuery;

    let { data, error } = await baseQuery()
        .order("created_at", { ascending: false })
        .limit(1);
    if (error && error.message.toLowerCase().includes("created_at")) {
        ({ data, error } = await baseQuery()
            .order("approved_at", { ascending: false })
            .limit(1));
    }
    if (error && error.message.toLowerCase().includes("approved_at")) {
        ({ data, error } = await baseQuery()
            .order("finalized_at", { ascending: false })
            .limit(1));
    }

    if (error) throw error;
    const row = data?.[0];
    return row ? mapMinutesExpanded(row as RawRecord) : null;
}

export async function lockMeetingMinutes(
    entityId: string,
    meetingId: string,
    minutesId: string,
): Promise<MinutesExpandedRecord> {
    const supabase = await getGovernanceClient();
    const meetingInfo = await getMeetingRowForEntity(
        supabase,
        entityId,
        meetingId,
    );
    if (!meetingInfo) {
        throw new Error("Meeting not found");
    }

    // TODO: replace with a governance.approve_meeting_minutes RPC.
    const { data, error } = await supabase
        .schema("governance")
        .from("meeting_minutes")
        .update({
            locked_at: new Date().toISOString(),
            status: MINUTES_STATUS.FINALIZED,
        })
        .eq("id", minutesId)
        .eq("meeting_id", meetingId)
        .select("*")
        .single();

    if (error) throw error;
    return mapMinutesExpanded(data as RawRecord);
}

export async function updateMeetingMinutes(
    entityId: string,
    meetingId: string,
    minutesId: string,
    contentMd: string,
): Promise<MinutesRecord> {
    const supabase = await getGovernanceClient();
    const meetingInfo = await getMeetingRowForEntity(
        supabase,
        entityId,
        meetingId,
    );
    if (!meetingInfo) {
        throw new Error("Meeting not found");
    }

    const { data, error } = await supabase
        .schema("governance")
        .from("meeting_minutes")
        .update({ content_md: contentMd })
        .eq("id", minutesId)
        .eq("meeting_id", meetingId)
        .select("*")
        .single();

    if (error) throw error;
    return mapMinutes(data as RawRecord, entityId);
}

export async function finalizeMeetingMinutes(
    entityId: string,
    meetingId: string,
    minutesId: string,
): Promise<MinutesRecord> {
    const supabase = await getGovernanceClient();
    const meetingInfo = await getMeetingRowForEntity(
        supabase,
        entityId,
        meetingId,
    );
    if (!meetingInfo) {
        throw new Error("Meeting not found");
    }

    const { data, error } = await supabase
        .schema("governance")
        .from("meeting_minutes")
        .update({
            status: MINUTES_STATUS.FINALIZED,
            finalized_at: new Date().toISOString(),
        })
        .eq("id", minutesId)
        .eq("meeting_id", meetingId)
        .select("*")
        .single();

    if (error) throw error;
    return mapMinutes(data as RawRecord, entityId);
}

export async function amendMeetingMinutes(
    entityId: string,
    meetingId: string,
    fromMinutesId: string,
): Promise<MinutesRecord> {
    const supabase = await getGovernanceClient();
    const meetingInfo = await getMeetingRowForEntity(
        supabase,
        entityId,
        meetingId,
    );
    if (!meetingInfo) {
        throw new Error("Meeting not found");
    }

    const { data: from, error: fromError } = await supabase
        .schema("governance")
        .from("meeting_minutes")
        .select("id, content_md, content")
        .eq("id", fromMinutesId)
        .eq("meeting_id", meetingId)
        .maybeSingle();

    if (fromError) throw fromError;
    if (!from?.id) {
        throw new Error("Minutes not found");
    }

    const fromRow = from as RawRecord;
    const contentMd = (fromRow.content_md as string | null | undefined) ??
        (fromRow.content as string | null | undefined) ??
        "";

    // Different environments have different minute schemas.
    // Use a permissive payload and cast through `unknown` to avoid TS drift.
    const payload = {
        meeting_id: meetingId,
        entity_id: entityId,
        // Legacy minutes schemas
        draft: true,
        content: contentMd,
        // Newer minutes schemas
        status: MINUTES_STATUS.DRAFT,
        content_md: contentMd,
        amended_from_minutes_id: fromMinutesId,
    } satisfies Record<string, unknown>;

    const { data, error } = await supabase
        .schema("governance")
        .from("meeting_minutes")
        .insert(
            payload as unknown as ExtendedGovernanceTables["meeting_minutes"][
                "Insert"
            ],
        )
        .select("*")
        .single();

    if (error) throw error;
    return mapMinutes(data as RawRecord, entityId);
}
