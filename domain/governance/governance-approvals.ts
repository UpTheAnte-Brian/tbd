import type { Database } from "@/database.types";

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

export type CreateBoardPacketResponse = {
    documentId: string;
    versionId: string;
};

export type UpdateBoardPacketContentRequest = {
    documentVersionId: string;
    contentMd: string;
};

export type ApproveBoardPacketRequest = {
    documentVersionId: string;
    approvalMethod?: string;
    signatureHash?: string;
};

export type BoardPacketSnapshot = {
    documentId: string | null;
    versionId: string | null;
    status: Database["public"]["Enums"]["document_version_status"] | null;
    contentMd: string | null;
    approvedAt: string | null;
    approvedBy: string | null;
    approvalId: string | null;
};
