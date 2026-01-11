export const MEETING_STATUS = {
    SCHEDULED: "scheduled",
    IN_SESSION: "in_session",
    ADJOURNED: "adjourned",
    CANCELLED: "cancelled",
} as const;

export type MeetingStatus =
    (typeof MEETING_STATUS)[keyof typeof MEETING_STATUS];

export const MINUTES_STATUS = {
    DRAFT: "draft",
    FINALIZED: "finalized",
    AMENDED: "amended",
} as const;

export type MinutesStatus =
    (typeof MINUTES_STATUS)[keyof typeof MINUTES_STATUS];

export const MOTION_STATUS = {
    PENDING: "pending",
    VOTING: "voting",
    PASSED: "passed",
    FAILED: "failed",
    TABLED: "tabled",
} as const;

export type MotionStatus =
    (typeof MOTION_STATUS)[keyof typeof MOTION_STATUS];

export const VOTE_VALUE = {
    YES: "yes",
    NO: "no",
    ABSTAIN: "abstain",
} as const;

export type VoteValue = (typeof VOTE_VALUE)[keyof typeof VOTE_VALUE];

export function isMeetingLockedForVotes(status: MeetingStatus): boolean {
    return status === MEETING_STATUS.ADJOURNED ||
        status === MEETING_STATUS.CANCELLED;
}

export function canEditMinutes(status: MinutesStatus): boolean {
    return status !== MINUTES_STATUS.FINALIZED;
}
