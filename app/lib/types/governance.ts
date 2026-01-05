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
    name: string;
    entity_id: string;
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
    draft: boolean | null;
    approved_at: string | null;
    approved_by: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export type ApprovalTargetType =
    | "meeting_minutes"
    | "document_version"
    | "motion"
    | string;

export interface GovernanceApproval {
    id: string;
    entity_id: string;
    target_type: ApprovalTargetType;
    target_id: string;
    board_member_id: string;
    approval_method: string | null;
    signature_hash: string;
    ip_address: string | null;
    approved_at: string | null;
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
