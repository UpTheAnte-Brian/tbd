export type ApproveMinutesRequest = {
    signatureHash?: string;
    approvalMethod?: string;
};

export type ApproveMinutesResponse = {
    entityId: string;
    meetingId: string;
    approvalId: string;
};

export type FinalizeMotionRequest = {
    signatureHash: string;
    approvalMethod?: string;
};

export type FinalizeMotionResponse = {
    entityId: string;
    motionId: string;
    approvalId: string;
};
