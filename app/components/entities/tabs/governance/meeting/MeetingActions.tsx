"use client";

import { MEETING_STATUS } from "@/domain/governance/constants";
import type { MeetingDTO, PermissionsDTO } from "./types";
import toast from "react-hot-toast";

async function post(url: string) {
    const res = await fetch(url, { method: "POST" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Request failed");
    return json;
}

export function MeetingActions(props: {
    entityId: string;
    meeting: MeetingDTO;
    permissions: PermissionsDTO;
    onChanged: () => void;
}) {
    const { entityId, meeting, permissions, onChanged } = props;

    const canStart =
        meeting.status === MEETING_STATUS.SCHEDULED &&
        (permissions.isBoardMember || permissions.isBoardOfficer);

    const canAdjourn =
        meeting.status === MEETING_STATUS.IN_SESSION &&
        permissions.isBoardOfficer;

    return (
        <div className="flex gap-2">
            <button
                className="px-3 py-2 rounded bg-slate-900 text-white disabled:bg-slate-300"
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
                className="px-3 py-2 rounded bg-red-700 text-white disabled:bg-slate-300"
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
        </div>
    );
}
