"use client";

import { canEditMinutes, MINUTES_STATUS } from "@/domain/governance/constants";
import type { MinutesDTO } from "./types";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

async function putJSON<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Request failed");
    return json as T;
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Request failed");
    return json as T;
}

export function MinutesEditor(props: {
    entityId: string;
    meetingId: string;
    minutes: MinutesDTO | null;
    onChanged: () => void;
}) {
    const { entityId, meetingId, minutes, onChanged } = props;
    const [content, setContent] = useState(minutes?.content_md ?? "");
    const editable = minutes ? canEditMinutes(minutes.status) : false;

    useEffect(() => {
        setContent(minutes?.content_md ?? "");
    }, [minutes?.id]);

    if (!minutes) {
        return (
            <div className="border rounded p-4 text-slate-600">
                Select a minutes version.
            </div>
        );
    }

    return (
        <div className="border rounded p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="font-semibold">
                        Minutes ({minutes.status})
                    </div>
                    {minutes.finalized_at && (
                        <div className="text-sm text-brand-secondary-0">
                            Finalized:{" "}
                            {new Date(
                                minutes.finalized_at,
                            ).toLocaleString()}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        className="px-3 py-2 rounded bg-brand-secondary-1 text-brand-primary-1 disabled:bg-brand-secondary-2"
                        disabled={!editable}
                        onClick={async () => {
                            try {
                                await putJSON(
                                    `/api/entities/${entityId}/governance/meetings/${meetingId}/minutes`,
                                    {
                                        minutesId: minutes.id,
                                        content_md: content,
                                    },
                                );
                                toast.success("Saved");
                                onChanged();
                            } catch (err: unknown) {
                                const message =
                                    err instanceof Error
                                        ? err.message
                                        : "Save failed";
                                toast.error(message);
                            }
                        }}
                    >
                        Save
                    </button>

                    <button
                        className="px-3 py-2 rounded bg-brand-secondary-2 disabled:bg-brand-secondary-2"
                        disabled={minutes.status === MINUTES_STATUS.FINALIZED}
                        onClick={async () => {
                            if (
                                !confirm(
                                    "Finalize minutes? They will become read-only.",
                                )
                            ) {
                                return;
                            }
                            try {
                                await postJSON(
                                    `/api/entities/${entityId}/governance/meetings/${meetingId}/minutes/finalize`,
                                    { minutesId: minutes.id },
                                );
                                toast.success("Finalized");
                                onChanged();
                            } catch (err: unknown) {
                                const message =
                                    err instanceof Error
                                        ? err.message
                                        : "Finalize failed";
                                toast.error(message);
                            }
                        }}
                    >
                        Finalize
                    </button>

                    <button
                        className="px-3 py-2 rounded bg-slate-100 disabled:bg-slate-300"
                        disabled={minutes.status !== MINUTES_STATUS.FINALIZED}
                        onClick={async () => {
                            try {
                                await postJSON(
                                    `/api/entities/${entityId}/governance/meetings/${meetingId}/minutes/amend`,
                                    { fromMinutesId: minutes.id },
                                );
                                toast.success("Amendment created");
                                onChanged();
                            } catch (err: unknown) {
                                const message =
                                    err instanceof Error
                                        ? err.message
                                        : "Amend failed";
                                toast.error(message);
                            }
                        }}
                    >
                        Create amendment
                    </button>
                </div>
            </div>

            {minutes.status === MINUTES_STATUS.FINALIZED && (
                <div className="rounded bg-slate-50 border p-3 text-sm text-slate-700">
                    Finalized minutes are immutable. Create an amendment to make
                    changes.
                </div>
            )}

            <textarea
                className="w-full min-h-[280px] border rounded p-3 font-mono text-sm"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                readOnly={!editable}
            />
        </div>
    );
}
