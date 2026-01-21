"use client";

import { useState } from "react";
import { MEETING_STATUS } from "@/domain/governance/constants";
import type { MeetingDTO, PermissionsDTO } from "./types";
import { hashSignature } from "@/utils/crypto";
import toast from "react-hot-toast";

async function post(url: string) {
    const res = await fetch(url, { method: "POST" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Request failed");
    return json;
}

async function postJSON(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Request failed");
    return json;
}

export function MeetingActions(props: {
    entityId: string;
    meeting: MeetingDTO;
    permissions: PermissionsDTO;
    myUserId?: string;
    onChanged: () => void;
}) {
    const { entityId, meeting, permissions, myUserId, onChanged } = props;
    const [finalizing, setFinalizing] = useState(false);

    const isFinalized = Boolean(meeting.finalized_at);
    const isCancelled = meeting.status === MEETING_STATUS.CANCELLED;

    const canStart =
        meeting.status === MEETING_STATUS.SCHEDULED &&
        (permissions.isBoardMember || permissions.isBoardOfficer) &&
        !isFinalized;

    const canAdjourn =
        meeting.status === MEETING_STATUS.IN_SESSION &&
        permissions.isBoardOfficer &&
        !isFinalized;

    const canFinalizeMeeting = !isFinalized && !isCancelled && !finalizing;
    const finalizeTitle = isFinalized
        ? "Meeting already finalized."
        : isCancelled
        ? "Cannot finalize a cancelled meeting."
        : "Finalize meeting";

    return (
        <div className="flex gap-2">
            <button
                className="px-3 py-2 rounded bg-brand-secondary-1 text-brand-primary-1 disabled:bg-brand-secondary-2"
                disabled={!canStart}
                title={
                    !canStart
                        ? "Only a board member or officer can start a scheduled meeting."
                        : "Start meeting"
                }
                onClick={async () => {
                    try {
                        await post(
                            `/api/entities/${entityId}/governance/meetings/${meeting.id}/start`,
                        );
                        toast.success("Meeting started");
                        onChanged();
                    } catch (err: unknown) {
                        const message =
                            err instanceof Error
                                ? err.message
                                : "Failed to start meeting";
                        toast.error(message);
                    }
                }}
            >
                Start meeting
            </button>

            <button
                className="px-3 py-2 rounded bg-brand-accent-2 text-brand-primary-1 disabled:bg-brand-secondary-2"
                disabled={!canAdjourn}
                title={
                    !canAdjourn
                        ? "Only an officer can adjourn an in-session meeting."
                        : "Adjourn meeting"
                }
                onClick={async () => {
                    if (!confirm("Adjourn meeting? Votes will be locked.")) {
                        return;
                    }
                    try {
                        await post(
                            `/api/entities/${entityId}/governance/meetings/${meeting.id}/adjourn`,
                        );
                        toast.success("Meeting adjourned");
                        onChanged();
                    } catch (err: unknown) {
                        const message =
                            err instanceof Error
                                ? err.message
                                : "Failed to adjourn meeting";
                        toast.error(message);
                    }
                }}
            >
                Adjourn
            </button>

            <button
                className="px-3 py-2 rounded bg-brand-primary-0 text-brand-primary-1 disabled:bg-brand-secondary-2"
                disabled={!canFinalizeMeeting}
                title={finalizeTitle}
                onClick={async () => {
                    if (
                        !confirm(
                            "Finalize this meeting? This will generate draft minutes and lock meeting activity.",
                        )
                    ) {
                        return;
                    }
                    if (!myUserId) {
                        toast.error("Sign in to finalize meeting");
                        return;
                    }
                    setFinalizing(true);
                    try {
                        const payload = {
                            meeting_id: meeting.id,
                            user_id: myUserId,
                            timestamp_iso: new Date().toISOString(),
                        };
                        const signatureHash = await hashSignature(payload);
                        await postJSON(
                            `/api/entities/${entityId}/governance/meetings/${meeting.id}/finalize`,
                            { signature_hash: signatureHash },
                        );
                        toast.success("Meeting finalized");
                        onChanged();
                    } catch (err: unknown) {
                        const message =
                            err instanceof Error
                                ? err.message
                                : "Failed to finalize meeting";
                        toast.error(message);
                    } finally {
                        setFinalizing(false);
                    }
                }}
            >
                {finalizing ? "Finalizing..." : "Finalize Meeting"}
            </button>
        </div>
    );
}
