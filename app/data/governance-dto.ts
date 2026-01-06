import "server-only";
import {
    type Board,
    type BoardMeeting,
    type BoardMember,
    type GovernanceApproval,
    type GovernanceSnapshot,
    type MeetingMinutes,
    type MeetingAttendance,
    type Motion,
    type Vote,
} from "@/app/lib/types/governance";
import type { ProfilePreview } from "@/app/lib/types/types";
import { createApiClient } from "@/utils/supabase/route";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface GovernanceClientOptions {
    elevated?: boolean;
}

async function getGovernanceClient(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: GovernanceClientOptions,
): Promise<SupabaseClient> {
    return createApiClient();
}

function governanceTable(
    supabase: SupabaseClient,
    table: string,
) {
    return supabase.schema("governance").from(table);
}

export interface BoardMemberInput {
    user_id: string;
    role: BoardMember["role"];
    term_start?: string | null;
    term_end?: string | null;
    status?: BoardMember["status"];
}

export interface MeetingInput {
    meeting_type?: string | null;
    scheduled_start?: string | null;
    scheduled_end?: string | null;
    status?: string | null;
    title: string;
}

export interface MotionInput {
    meeting_id: string;
    title?: string | null;
    description?: string | null;
    moved_by?: string | null;
    seconded_by?: string | null;
    status?: string | null;
}

export interface VoteInput {
    motion_id: string;
    board_member_id: string;
    vote: Vote["vote"];
    signed_at?: string | null;
}

export interface MinutesInput {
    meeting_id: string;
    content?: string | null;
    draft?: boolean;
    approved_at?: string | null;
    approved_by?: string | null;
}

export interface ApprovalInput {
    entity_id: string;
    target_type: GovernanceApproval["target_type"];
    target_id: string;
    board_member_id: string;
    approval_method?: string;
    signature_hash: string;
    ip_address?: string | null;
    approved_at?: string | null;
}

const PROFILE_FIELDS =
    "id, full_name, username, first_name, last_name, avatar_url, website";

function mapProfile(profileRaw: unknown): ProfilePreview | null {
    if (!profileRaw) return null;
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    if (!profile || typeof profile !== "object") return null;

    const {
        id,
        full_name = null,
        username = null,
        first_name = null,
        last_name = null,
        avatar_url = null,
        website = null,
    } = profile as {
        id?: string;
        full_name?: string | null;
        username?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        avatar_url?: string | null;
        website?: string | null;
    };

    if (!id) return null;

    return {
        id: String(id),
        full_name,
        username,
        first_name,
        last_name,
        avatar_url,
        website,
        entity_users: undefined,
    };
}

function mapBoard(row: Record<string, unknown> | null): Board | null {
    if (!row || !row.id || !row.entity_id) return null;
    return {
        id: String(row.id),
        name: String(row.name),
        entity_id: String(row.entity_id),
        created_at: (row.created_at as string | null | undefined) ?? null,
    };
}

function mapBoardMember(
    row: Record<string, unknown> | null,
    profile?: ProfilePreview | null,
): BoardMember | null {
    if (!row || !row.id || !row.board_id || !row.user_id || !row.role) {
        return null;
    }

    return {
        id: String(row.id),
        board_id: String(row.board_id),
        user_id: String(row.user_id),
        role: row.role as BoardMember["role"],
        term_start: (row.term_start as string | null | undefined) ?? null,
        term_end: (row.term_end as string | null | undefined) ?? null,
        status: (row.status as BoardMember["status"]) ?? "active",
        profile: profile ?? null,
        created_at: (row.created_at as string | null | undefined) ?? null,
    };
}

async function fetchProfilesByIds(
    supabase: SupabaseClient,
    userIds: string[],
): Promise<Map<string, ProfilePreview>> {
    if (userIds.length === 0) return new Map();
    const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_FIELDS)
        .in("id", userIds);

    if (error) throw error;

    const map = new Map<string, ProfilePreview>();
    (data ?? []).forEach((row) => {
        const profile = mapProfile(row);
        if (profile) map.set(profile.id, profile);
    });
    return map;
}

function attachProfilesToMembers(
    members: BoardMember[],
    profiles: Map<string, ProfilePreview>,
): BoardMember[] {
    return members.map((member) => ({
        ...member,
        profile: profiles.get(member.user_id) ?? null,
    }));
}

function mapMeeting(
    row: Record<string, unknown> | null,
): BoardMeeting | null {
    if (!row || !row.id || !row.board_id) return null;
    return {
        id: String(row.id),
        board_id: String(row.board_id),
        meeting_type: (row.meeting_type as string | null | undefined) ?? null,
        scheduled_start: (row.scheduled_start as string | null | undefined) ??
            null,
        scheduled_end: (row.scheduled_end as string | null | undefined) ?? null,
        status: (row.status as string | null | undefined) ?? null,
        created_at: (row.created_at as string | null | undefined) ?? null,
        updated_at: (row.updated_at as string | null | undefined) ?? null,
    };
}

function mapMotion(row: Record<string, unknown> | null): Motion | null {
    if (!row || !row.id || !row.meeting_id) return null;
    return {
        id: String(row.id),
        meeting_id: String(row.meeting_id),
        title: (row.title as string | null | undefined) ?? null,
        description: (row.description as string | null | undefined) ?? null,
        moved_by: (row.moved_by as string | null | undefined) ?? null,
        seconded_by: (row.seconded_by as string | null | undefined) ?? null,
        status: (row.status as string | null | undefined) ?? null,
        finalized_at: (row.finalized_at as string | null | undefined) ?? null,
        created_at: (row.created_at as string | null | undefined) ?? null,
        updated_at: (row.updated_at as string | null | undefined) ?? null,
    };
}

function mapVote(row: Record<string, unknown> | null): Vote | null {
    if (!row || !row.id || !row.motion_id || !row.board_member_id) return null;
    return {
        id: String(row.id),
        motion_id: String(row.motion_id),
        board_member_id: String(row.board_member_id),
        vote: (row.vote as Vote["vote"]) ?? "yes",
        signed_at: (row.signed_at as string | null | undefined) ?? null,
        created_at: (row.created_at as string | null | undefined) ?? null,
    };
}

function mapMinutes(
    row: Record<string, unknown> | null,
): MeetingMinutes | null {
    if (!row || !row.id || !row.meeting_id) return null;
    return {
        id: String(row.id),
        meeting_id: String(row.meeting_id),
        content: (row.content as string | null | undefined) ?? null,
        draft: (row.draft as boolean | null | undefined) ?? null,
        approved_at: (row.approved_at as string | null | undefined) ?? null,
        approved_by: (row.approved_by as string | null | undefined) ?? null,
        created_at: (row.created_at as string | null | undefined) ?? null,
        updated_at: (row.updated_at as string | null | undefined) ?? null,
    };
}

function mapMeetingAttendance(
    row: Record<string, unknown> | null,
): MeetingAttendance | null {
    if (!row || !row.meeting_id || !row.board_member_id) return null;
    return {
        id: row.id ? String(row.id) : null,
        meeting_id: String(row.meeting_id),
        board_member_id: String(row.board_member_id),
        status: (row.status as MeetingAttendance["status"]) ?? "absent",
        created_at: (row.created_at as string | null | undefined) ?? null,
        updated_at: (row.updated_at as string | null | undefined) ?? null,
    };
}

function mapApproval(
    row: Record<string, unknown> | null,
): GovernanceApproval | null {
    if (
        !row || !row.id || !row.entity_id || !row.target_type ||
        !row.target_id || !row.board_member_id
    ) {
        return null;
    }

    return {
        id: String(row.id),
        entity_id: String(row.entity_id),
        target_type: row.target_type as GovernanceApproval["target_type"],
        target_id: String(row.target_id),
        board_member_id: String(row.board_member_id),
        approval_method: (row.approval_method as string | null | undefined) ??
            null,
        signature_hash: String(row.signature_hash ?? ""),
        ip_address: (row.ip_address as string | null | undefined) ?? null,
        approved_at: (row.approved_at as string | null | undefined) ?? null,
    };
}

export async function getBoardByEntityId(
    entityId: string,
    options?: GovernanceClientOptions,
): Promise<Board | null> {
    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "boards")
        .select("*")
        .eq("entity_id", entityId)
        .maybeSingle();

    if (error) throw error;
    return mapBoard(data as Record<string, unknown> | null);
}

// Backwards-compatible alias (treats nonprofitId as entityId)
export async function getBoardByNonprofitId(
    nonprofitId: string,
    options?: GovernanceClientOptions,
): Promise<Board | null> {
    return getBoardByEntityId(nonprofitId, options);
}

export async function ensureBoardForEntity(
    entityId: string,
    options?: GovernanceClientOptions,
): Promise<Board> {
    const existing = await getBoardByEntityId(entityId, options);
    if (existing) return existing;

    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "boards")
        .insert({ entity_id: entityId })
        .select("*")
        .single();

    if (error) throw error;
    const mapped = mapBoard(data as Record<string, unknown>);
    if (!mapped) throw new Error("Failed to create board");
    return mapped;
}

// Backwards-compatible alias (treats nonprofitId as entityId)
export async function ensureBoardForNonprofit(
    nonprofitId: string,
    options?: GovernanceClientOptions,
): Promise<Board> {
    return ensureBoardForEntity(nonprofitId, options);
}

export async function listBoardMembers(
    boardId: string,
    options?: GovernanceClientOptions,
): Promise<BoardMember[]> {
    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "board_members")
        .select(
            `
        id, board_id, user_id, role, term_start, term_end, status, created_at
      `,
        )
        .eq("board_id", boardId)
        .order("role", { ascending: true })
        .order("created_at", { ascending: true });

    if (error) throw error;
    const members = (data ?? [])
        .map((row) => mapBoardMember(row as Record<string, unknown>))
        .filter((m): m is BoardMember => Boolean(m));
    const profiles = await fetchProfilesByIds(
        supabase,
        members.map((m) => m.user_id),
    );
    return attachProfilesToMembers(members, profiles);
}

export async function addBoardMember(
    boardId: string,
    payload: BoardMemberInput,
    options?: GovernanceClientOptions,
): Promise<BoardMember> {
    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "board_members")
        .insert({
            board_id: boardId,
            user_id: payload.user_id,
            role: payload.role,
            term_start: payload.term_start ?? null,
            term_end: payload.term_end ?? null,
            status: payload.status ?? "active",
        })
        .select(
            `
        id, board_id, user_id, role, term_start, term_end, status, created_at
      `,
        )
        .single();

    if (error) throw error;
    const mapped = mapBoardMember(data as Record<string, unknown>);
    if (!mapped) throw new Error("Failed to map created board member");
    const profiles = await fetchProfilesByIds(supabase, [mapped.user_id]);
    return {
        ...mapped,
        profile: profiles.get(mapped.user_id) ?? null,
    };
}

export async function updateBoardMember(
    memberId: string,
    updates: Partial<BoardMemberInput>,
    options?: GovernanceClientOptions,
): Promise<BoardMember> {
    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "board_members")
        .update({
            role: updates.role ?? undefined,
            term_start: updates.term_start,
            term_end: updates.term_end,
            status: updates.status,
        })
        .eq("id", memberId)
        .select(
            `
        id, board_id, user_id, role, term_start, term_end, status, created_at
      `,
        )
        .single();

    if (error) throw error;
    const mapped = mapBoardMember(data as Record<string, unknown>);
    if (!mapped) throw new Error("Failed to map updated board member");
    const profiles = await fetchProfilesByIds(supabase, [mapped.user_id]);
    return {
        ...mapped,
        profile: profiles.get(mapped.user_id) ?? null,
    };
}

export async function removeBoardMember(
    memberId: string,
    options?: GovernanceClientOptions,
): Promise<void> {
    const supabase = await getGovernanceClient(options);
    const { error } = await governanceTable(supabase, "board_members")
        .delete()
        .eq("id", memberId);
    if (error) throw error;
}

export async function listBoardMeetings(
    boardId: string,
    options?: GovernanceClientOptions,
): Promise<BoardMeeting[]> {
    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "board_meetings")
        .select("*")
        .eq("board_id", boardId)
        .order("scheduled_start", { ascending: true });

    if (error) throw error;
    return (data ?? [])
        .map((row) => mapMeeting(row as Record<string, unknown>))
        .filter((m): m is BoardMeeting => Boolean(m));
}

export async function getBoardMeeting(
    meetingId: string,
    options?: GovernanceClientOptions,
): Promise<BoardMeeting | null> {
    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "board_meetings")
        .select("*")
        .eq("id", meetingId)
        .maybeSingle();

    if (error) throw error;
    return mapMeeting(data as Record<string, unknown> | null);
}

export async function createBoardMeeting(
    boardId: string,
    input: MeetingInput,
    options?: GovernanceClientOptions,
): Promise<BoardMeeting> {
    const supabase = await getGovernanceClient(options);
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user?.id) {
        throw new Error("You must be signed in to create a meeting");
    }
    const payload: Record<string, unknown> = {
        board_id: boardId,
        created_by: user.id,
        title: input.title,
        meeting_type: input.meeting_type ?? null,
        scheduled_start: input.scheduled_start ?? null,
        scheduled_end: input.scheduled_end ?? null,
    };
    if (input.status !== undefined) payload.status = input.status;
    const { data, error } = await governanceTable(supabase, "board_meetings")
        .insert(payload)
        .select("*")
        .single();

    if (error) throw error;
    const mapped = mapMeeting(data as Record<string, unknown>);
    if (!mapped) throw new Error("Failed to create meeting");
    return mapped;
}

export async function updateBoardMeeting(
    meetingId: string,
    updates: MeetingInput,
    options?: GovernanceClientOptions,
): Promise<BoardMeeting> {
    const supabase = await getGovernanceClient(options);
    const payload: Record<string, unknown> = {};
    if (updates.meeting_type !== undefined) {
        payload.meeting_type = updates.meeting_type;
    }
    if (updates.scheduled_start !== undefined) {
        payload.scheduled_start = updates.scheduled_start;
    }
    if (updates.scheduled_end !== undefined) {
        payload.scheduled_end = updates.scheduled_end;
    }
    if (updates.status !== undefined) payload.status = updates.status;
    const { data, error } = await governanceTable(supabase, "board_meetings")
        .update(payload)
        .eq("id", meetingId)
        .select("*")
        .single();

    if (error) throw error;
    const mapped = mapMeeting(data as Record<string, unknown>);
    if (!mapped) throw new Error("Failed to update meeting");
    return mapped;
}

export async function deleteBoardMeeting(
    meetingId: string,
    options?: GovernanceClientOptions,
): Promise<void> {
    const supabase = await getGovernanceClient(options);
    const { error } = await governanceTable(supabase, "board_meetings")
        .delete()
        .eq("id", meetingId);
    if (error) throw error;
}

export async function listMotionsByMeetingIds(
    meetingIds: string[],
    options?: GovernanceClientOptions,
): Promise<Motion[]> {
    if (meetingIds.length === 0) return [];
    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "motions")
        .select("*")
        .in("meeting_id", meetingIds)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? [])
        .map((row) => mapMotion(row as Record<string, unknown>))
        .filter((m): m is Motion => Boolean(m));
}

export async function getMotion(
    motionId: string,
    options?: GovernanceClientOptions,
): Promise<Motion | null> {
    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "motions")
        .select("*")
        .eq("id", motionId)
        .maybeSingle();

    if (error) throw error;
    return mapMotion(data as Record<string, unknown> | null);
}

export async function createMotion(
    input: MotionInput,
    options?: GovernanceClientOptions,
): Promise<Motion> {
    const supabase = await getGovernanceClient(options);
    const payload: Record<string, unknown> = {
        meeting_id: input.meeting_id,
        title: input.title ?? null,
        description: input.description ?? null,
        moved_by: input.moved_by ?? null,
        seconded_by: input.seconded_by ?? null,
    };
    if (input.status !== undefined) payload.status = input.status;
    const { data, error } = await governanceTable(supabase, "motions")
        .insert(payload)
        .select("*")
        .single();

    if (error) throw error;
    const mapped = mapMotion(data as Record<string, unknown>);
    if (!mapped) throw new Error("Failed to create motion");
    return mapped;
}

export async function updateMotion(
    motionId: string,
    updates: Partial<MotionInput> & { finalized_at?: string | null },
    options?: GovernanceClientOptions,
): Promise<Motion> {
    const supabase = await getGovernanceClient(options);
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) {
        payload.description = updates.description;
    }
    if (updates.moved_by !== undefined) payload.moved_by = updates.moved_by;
    if (updates.seconded_by !== undefined) {
        payload.seconded_by = updates.seconded_by;
    }
    if (updates.finalized_at !== undefined) {
        payload.finalized_at = updates.finalized_at;
    }
    if (updates.status !== undefined) payload.status = updates.status;
    const { data, error } = await governanceTable(supabase, "motions")
        .update(payload)
        .eq("id", motionId)
        .select("*")
        .single();

    if (error) throw error;
    const mapped = mapMotion(data as Record<string, unknown>);
    if (!mapped) throw new Error("Failed to update motion");
    return mapped;
}

export async function listVotesByMotionIds(
    motionIds: string[],
    options?: GovernanceClientOptions,
): Promise<Vote[]> {
    if (motionIds.length === 0) return [];
    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "votes")
        .select("*")
        .in("motion_id", motionIds)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? [])
        .map((row) => mapVote(row as Record<string, unknown>))
        .filter((v): v is Vote => Boolean(v));
}

export async function castVote(
    payload: VoteInput,
    options?: GovernanceClientOptions,
): Promise<Vote> {
    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "votes")
        .insert({
            motion_id: payload.motion_id,
            board_member_id: payload.board_member_id,
            vote: payload.vote,
            signed_at: payload.signed_at ?? null,
        })
        .select("*")
        .single();

    if (error) throw error;
    const mapped = mapVote(data as Record<string, unknown>);
    if (!mapped) throw new Error("Failed to record vote");
    return mapped;
}

export async function listMinutesByMeetingIds(
    meetingIds: string[],
    options?: GovernanceClientOptions,
): Promise<MeetingMinutes[]> {
    if (meetingIds.length === 0) return [];
    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "meeting_minutes")
        .select("*")
        .in("meeting_id", meetingIds);

    if (error) throw error;
    return (data ?? [])
        .map((row) => mapMinutes(row as Record<string, unknown>))
        .filter((m): m is MeetingMinutes => Boolean(m));
}

export async function listMeetingAttendanceByMeetingIds(
    meetingIds: string[],
    options?: GovernanceClientOptions,
): Promise<MeetingAttendance[]> {
    if (meetingIds.length === 0) return [];
    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "meeting_attendance")
        .select("*")
        .in("meeting_id", meetingIds);

    if (error) throw error;
    return (data ?? [])
        .map((row) => mapMeetingAttendance(row as Record<string, unknown>))
        .filter((a): a is MeetingAttendance => Boolean(a));
}

export async function saveMinutes(
    payload: MinutesInput & { id?: string },
    options?: GovernanceClientOptions,
): Promise<MeetingMinutes> {
    const supabase = await getGovernanceClient(options);
    const { id, ...rest } = payload;
    const mutation = id
        ? governanceTable(supabase, "meeting_minutes")
            .update({
                content: rest.content ?? undefined,
                draft: rest.draft ?? undefined,
                approved_at: rest.approved_at ?? undefined,
                approved_by: rest.approved_by ?? undefined,
            })
            .eq("id", id)
        : governanceTable(supabase, "meeting_minutes").insert({
            meeting_id: rest.meeting_id,
            content: rest.content ?? null,
            draft: rest.draft ?? true,
            approved_at: rest.approved_at ?? null,
            approved_by: rest.approved_by ?? null,
        });

    const { data, error } = await mutation.select("*").single();
    if (error) throw error;
    const mapped = mapMinutes(data as Record<string, unknown>);
    if (!mapped) throw new Error("Failed to save minutes");
    return mapped;
}

export async function listApprovalsByEntityId(
    entityId: string,
    options?: GovernanceClientOptions,
): Promise<GovernanceApproval[]> {
    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "approvals")
        .select("*")
        .eq("entity_id", entityId);

    if (error) throw error;
    return (data ?? [])
        .map((row) => mapApproval(row as Record<string, unknown>))
        .filter((a): a is GovernanceApproval => Boolean(a));
}

export async function listApprovalsByTargets(
    targets: Array<
        { target_type: GovernanceApproval["target_type"]; target_id: string }
    >,
    options?: GovernanceClientOptions,
): Promise<GovernanceApproval[]> {
    if (targets.length === 0) return [];

    const supabase = await getGovernanceClient(options);

    // Supabase can't do a clean multi-column IN, so we query per target_type and merge.
    const byType = new Map<GovernanceApproval["target_type"], string[]>();
    for (const t of targets) {
        const arr = byType.get(t.target_type) ?? [];
        arr.push(t.target_id);
        byType.set(t.target_type, arr);
    }

    const results: GovernanceApproval[] = [];

    for (const [target_type, ids] of byType.entries()) {
        const { data, error } = await governanceTable(supabase, "approvals")
            .select("*")
            .eq("target_type", target_type)
            .in("target_id", ids);

        if (error) throw error;
        (data ?? []).forEach((row) => {
            const mapped = mapApproval(row as Record<string, unknown>);
            if (mapped) results.push(mapped);
        });
    }

    return results;
}

export async function createApproval(
    payload: ApprovalInput,
    options?: GovernanceClientOptions,
): Promise<GovernanceApproval> {
    const supabase = await getGovernanceClient(options);
    const { data, error } = await governanceTable(supabase, "approvals")
        .insert({
            entity_id: payload.entity_id,
            target_type: payload.target_type,
            target_id: payload.target_id,
            board_member_id: payload.board_member_id,
            approval_method: payload.approval_method ?? "clickwrap",
            signature_hash: payload.signature_hash,
            ip_address: payload.ip_address ?? null,
            approved_at: payload.approved_at ?? undefined,
        })
        .select("*")
        .single();

    if (error) throw error;
    const mapped = mapApproval(data as Record<string, unknown>);
    if (!mapped) throw new Error("Failed to create approval");
    return mapped;
}

export async function getGovernanceSnapshot(
    entityId: string,
    options?: GovernanceClientOptions,
): Promise<GovernanceSnapshot> {
    const board = await ensureBoardForEntity(entityId, options);
    const [members, meetings] = await Promise.all([
        listBoardMembers(board.id, options),
        listBoardMeetings(board.id, options),
    ]);

    const meetingIds = meetings.map((m) => m.id);
    const [motions, minutes, attendance] = await Promise.all([
        listMotionsByMeetingIds(meetingIds, options),
        listMinutesByMeetingIds(meetingIds, options),
        listMeetingAttendanceByMeetingIds(meetingIds, options),
    ]);

    const motionIds = motions.map((m) => m.id);
    const approvals = await listApprovalsByTargets(
        [
            ...motionIds.map((id) => ({
                target_type: "motion" as const,
                target_id: id,
            })),
            ...minutes.map((m) => ({
                target_type: "meeting_minutes" as const,
                target_id: m.id,
            })),
        ],
        options,
    );
    const votes = await listVotesByMotionIds(motionIds, options);

    return {
        board,
        members,
        meetings,
        motions,
        votes,
        minutes,
        approvals,
        attendance,
    };
}
