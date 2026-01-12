import type {
    MeetingStatus,
    MinutesStatus,
    MotionStatus,
    VoteValue,
} from "@/domain/governance/constants";

export type MeetingDTO = {
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
};

export type PermissionsDTO = {
    isBoardMember: boolean;
    isBoardOfficer: boolean;
};

export type MotionDTO = {
    id: string;
    meeting_id: string;
    entity_id: string;
    title: string;
    status: MotionStatus;
    created_at: string;
    finalized_at: string | null;
};

export type VoteDTO = {
    id: string;
    motion_id: string;
    user_id: string | null;
    value: VoteValue;
    created_at: string | null;
    updated_at: string | null;
};

export type MinutesDTO = {
    id: string;
    meeting_id: string;
    entity_id: string;
    status: MinutesStatus;
    content_md: string | null;
    created_at: string | null;
    finalized_at: string | null;
    amended_from_minutes_id: string | null;
};

export type MinutesExpandedDTO = {
    id: string;
    meeting_id: string;
    status: MinutesStatus;
    content_md: string | null;
    content_json: unknown | null;
    created_at: string | null;
    finalized_at: string | null;
    locked_at: string | null;
};
