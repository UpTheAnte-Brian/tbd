"use client";

import { useEffect, useMemo, useState } from "react";
import type {
    MeetingDTO,
    MotionDTO,
    MinutesDTO,
    MinutesExpandedDTO,
    PermissionsDTO,
} from "./types";
import { MeetingStatusHeader } from "./MeetingStatusHeader";
import { MeetingActions } from "./MeetingActions";
import { MotionVotePanel } from "./MotionVotePanel";
import { VersionHistory } from "./VersionHistory";
import { MinutesEditor } from "./MinutesEditor";
import toast from "react-hot-toast";

async function getJSON<T>(url: string): Promise<T> {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Request failed");
    return json as T;
}

async function postJSON<T>(
    url: string,
    body: Record<string, unknown>,
): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Request failed");
    return json as T;
}

export function MeetingDetail(props: {
    entityId: string;
    meetingId: string;
    myUserId?: string;
}) {
    const { entityId, meetingId, myUserId } = props;

    const [meeting, setMeeting] = useState<MeetingDTO | null>(null);
    const [permissions, setPermissions] = useState<PermissionsDTO>({
        isBoardMember: false,
        isBoardOfficer: false,
    });
    const [motions, setMotions] = useState<MotionDTO[]>([]);
    const [minutesVersions, setMinutesVersions] = useState<MinutesDTO[]>([]);
    const [minutesExpanded, setMinutesExpanded] =
        useState<MinutesExpandedDTO | null>(null);
    const [minutesExpandedLoaded, setMinutesExpandedLoaded] = useState(false);
    const [minutesApproving, setMinutesApproving] = useState(false);
    const [selectedMinutesId, setSelectedMinutesId] = useState<string | null>(
        null,
    );
    const [newMotionTitle, setNewMotionTitle] = useState("");

    const selectedMinutes = useMemo(
        () =>
            minutesVersions.find((version) => version.id === selectedMinutesId) ??
            null,
        [minutesVersions, selectedMinutesId],
    );

    async function refreshMinutesExpanded() {
        setMinutesExpandedLoaded(false);
        setMinutesExpanded(null);
        try {
            const minutesResponse = await getJSON<{
                minutes: MinutesExpandedDTO | null;
            }>(
                `/api/entities/${entityId}/governance/meetings/${meetingId}/minutes/expanded`,
            );
            setMinutesExpanded(minutesResponse.minutes ?? null);
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Failed to load minutes";
            toast.error(message);
            setMinutesExpanded(null);
        } finally {
            setMinutesExpandedLoaded(true);
        }
    }

    async function refreshAll() {
        try {
            const detail = await getJSON<{
                meeting: MeetingDTO;
                permissions: PermissionsDTO;
            }>(
                `/api/entities/${entityId}/governance/meetings/${meetingId}`,
            );
            setMeeting(detail.meeting);
            setPermissions(detail.permissions);

            const motionsResponse = await getJSON<{ motions: MotionDTO[] }>(
                `/api/entities/${entityId}/governance/meetings/${meetingId}/motions`,
            );
            setMotions(motionsResponse.motions);

            const minutesResponse = await getJSON<{ versions: MinutesDTO[] }>(
                `/api/entities/${entityId}/governance/meetings/${meetingId}/minutes`,
            );
            setMinutesVersions(minutesResponse.versions);

            if (minutesResponse.versions.length > 0) {
                const hasSelected = minutesResponse.versions.some(
                    (version) => version.id === selectedMinutesId,
                );
                if (!selectedMinutesId || !hasSelected) {
                    setSelectedMinutesId(minutesResponse.versions[0].id);
                }
            }

            await refreshMinutesExpanded();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Failed to load meeting";
            toast.error(message);
        }
    }

    useEffect(() => {
        void refreshAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityId, meetingId]);

    if (!meeting) {
        return <div className="p-4 text-slate-600">Loading meeting...</div>;
    }

    const meetingFinalized = Boolean(meeting.finalized_at);

    return (
        <div className="space-y-4">
            <div className="border rounded p-4 space-y-3">
                <MeetingStatusHeader
                    title={meeting.title ?? "Board Meeting"}
                    status={meeting.status}
                    scheduledAt={meeting.scheduled_at}
                    startedAt={meeting.started_at}
                    adjournedAt={meeting.adjourned_at}
                />

                {meeting.finalized_at && (
                    <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        Finalized on{" "}
                        {new Date(meeting.finalized_at).toLocaleString()}
                    </div>
                )}

                <MeetingActions
                    entityId={entityId}
                    meeting={meeting}
                    permissions={permissions}
                    myUserId={myUserId}
                    onChanged={refreshAll}
                />
            </div>

            <div className="border rounded p-4 space-y-3">
                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <div className="font-semibold mb-1">Motions</div>
                        <input
                            className="w-full border rounded px-3 py-2"
                            placeholder="New motion title..."
                            value={newMotionTitle}
                            onChange={(event) =>
                                setNewMotionTitle(event.target.value)}
                            disabled={meetingFinalized}
                        />
                    </div>

                    <button
                        className="px-3 py-2 rounded bg-brand-secondary-1 text-brand-primary-1 disabled:bg-brand-secondary-2"
                        disabled={!newMotionTitle.trim() || meetingFinalized}
                        onClick={async () => {
                            try {
                                const res = await fetch(
                                    `/api/entities/${entityId}/governance/meetings/${meetingId}/motions`,
                                    {
                                        method: "POST",
                                        headers: {
                                            "content-type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            title: newMotionTitle.trim(),
                                        }),
                                    },
                                );
                                const json = await res.json();
                                if (!res.ok) {
                                    throw new Error(
                                        json?.error ?? "Failed",
                                    );
                                }
                                toast.success("Motion created");
                                setNewMotionTitle("");
                                await refreshAll();
                            } catch (err: unknown) {
                                const message =
                                    err instanceof Error
                                        ? err.message
                                        : "Create motion failed";
                                toast.error(message);
                            }
                        }}
                    >
                        Add
                    </button>
                </div>

                <div className="space-y-3">
                    {motions.map((motion) => (
                        <MotionVotePanel
                            key={motion.id}
                            entityId={entityId}
                            meeting={meeting}
                            motion={motion}
                            myUserId={myUserId}
                        />
                    ))}
                    {motions.length === 0 && (
                        <div className="text-sm text-brand-secondary-0">
                            No motions yet.
                        </div>
                    )}
                </div>
            </div>

            <div className="border rounded p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">Minutes</div>
                    {minutesExpandedLoaded && minutesExpanded && (
                        <span className="rounded-full bg-brand-secondary-2 px-3 py-1 text-sm text-brand-secondary-0">
                            {minutesExpanded.status}
                        </span>
                    )}
                </div>

                {!minutesExpandedLoaded && (
                    <div className="text-sm text-brand-secondary-0">
                        Loading minutes...
                    </div>
                )}
                {minutesExpandedLoaded && !minutesExpanded && (
                    <div className="text-sm text-brand-secondary-0">
                        No minutes generated yet.
                    </div>
                )}
                {minutesExpandedLoaded && minutesExpanded && (
                    <>
                        <div className="rounded border bg-brand-secondary-2 p-3 text-sm text-brand-secondary-1 whitespace-pre-wrap">
                            {minutesExpanded.content_md ??
                                "No minutes content available."}
                        </div>
                        <details className="rounded border bg-brand-primary-1 p-3 text-sm text-brand-secondary-1">
                            <summary className="cursor-pointer text-brand-secondary-0">
                                Raw JSON
                            </summary>
                            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap text-xs text-brand-secondary-0">
                                {JSON.stringify(
                                    minutesExpanded.content_json ?? {},
                                    null,
                                    2,
                                )}
                            </pre>
                        </details>

                        <div className="flex items-center gap-2">
                            <button
                                className="px-3 py-2 rounded bg-brand-secondary-1 text-brand-primary-1 disabled:bg-brand-secondary-2"
                                disabled={
                                    minutesApproving ||
                                    Boolean(minutesExpanded.locked_at)
                                }
                                onClick={async () => {
                                    if (
                                        !confirm(
                                            "Lock minutes? This prevents edits.",
                                        )
                                    ) {
                                        return;
                                    }
                                    setMinutesApproving(true);
                                    try {
                                        await postJSON(
                                            `/api/entities/${entityId}/governance/meetings/${meetingId}/minutes/lock`,
                                            { minutesId: minutesExpanded.id },
                                        );
                                        toast.success("Minutes locked");
                                        await refreshAll();
                                    } catch (err: unknown) {
                                        const message =
                                            err instanceof Error
                                                ? err.message
                                                : "Failed to lock minutes";
                                        toast.error(message);
                                    } finally {
                                        setMinutesApproving(false);
                                    }
                                }}
                            >
                                {minutesApproving
                                    ? "Locking..."
                                    : "Approve Minutes"}
                            </button>
                            {minutesExpanded.locked_at && (
                                <span className="text-sm text-brand-secondary-0">
                                    Locked{" "}
                                    {new Date(
                                        minutesExpanded.locked_at,
                                    ).toLocaleString()}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <VersionHistory
                    versions={minutesVersions}
                    selectedId={selectedMinutesId}
                    onSelect={setSelectedMinutesId}
                />
                <div className="lg:col-span-2">
                    <MinutesEditor
                        entityId={entityId}
                        meetingId={meetingId}
                        minutes={selectedMinutes}
                        onChanged={refreshAll}
                    />
                </div>
            </div>
        </div>
    );
}
