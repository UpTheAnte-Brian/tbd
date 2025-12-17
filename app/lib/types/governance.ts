import type { ProfilePreview } from "@/app/lib/types/types";

export type BoardOfficerRole =
    | "chair"
    | "vice_chair"
    | "secretary"
    | "treasurer"
    | "director";

export type BoardMemberStatus = "active" | "expired" | "resigned" | "removed";

export interface Board {
    id: string;
    nonprofit_id: string;
    created_at?: string | null;
}

export interface BoardMember {
    id: string;
    board_id: string;
    user_id: string;
    role: BoardOfficerRole;
    term_start: string | null;
    term_end: string | null;
    status: BoardMemberStatus;
    profile?: ProfilePreview | null;
    created_at?: string | null;
}

export interface BoardMeeting {
    id: string;
    board_id: string;
    meeting_type: string | null;
    scheduled_start: string | null;
    scheduled_end: string | null;
    status: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface Motion {
    id: string;
    meeting_id: string;
    title?: string | null;
    description?: string | null;
    moved_by: string | null;
    seconded_by: string | null;
    status: string | null;
    finalized_at: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface Vote {
    id: string;
    motion_id: string;
    board_member_id: string;
    vote: "yes" | "no" | "abstain" | string;
    signed_at: string | null;
    created_at?: string | null;
}

export interface MeetingMinutes {
    id: string;
    meeting_id: string;
    content: string | null;
    approved_at: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface GovernanceApproval {
    id: string;
    entity_type: "motion" | "minutes" | string;
    entity_id: string;
    board_member_id: string;
    signature_hash: string | null;
    created_at?: string | null;
}

export interface GovernanceSnapshot {
    board: Board;
    members: BoardMember[];
    meetings: BoardMeeting[];
    motions: Motion[];
    votes: Vote[];
    minutes: MeetingMinutes[];
    approvals: GovernanceApproval[];
}
