"use client";

import { MEETING_STATUS, type MeetingStatus } from "@/domain/governance/constants";

function pillClass(status: MeetingStatus): string {
    switch (status) {
        case MEETING_STATUS.SCHEDULED:
            return "bg-slate-200 text-slate-800";
        case MEETING_STATUS.IN_SESSION:
            return "bg-green-200 text-green-900";
        case MEETING_STATUS.ADJOURNED:
            return "bg-red-200 text-red-900";
        case MEETING_STATUS.CANCELLED:
            return "bg-zinc-200 text-zinc-800";
        default:
            return "bg-slate-200 text-slate-800";
    }
}

export function MeetingStatusHeader(props: {
    title: string;
    status: MeetingStatus;
    scheduledAt?: string | null;
    startedAt?: string | null;
    adjournedAt?: string | null;
}) {
    const { title, status, scheduledAt, startedAt, adjournedAt } = props;

    return (
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <h2 className="text-lg font-semibold truncate">{title}</h2>
                <div className="mt-1 text-sm text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                    {scheduledAt && (
                        <span>
                            Scheduled: {new Date(scheduledAt).toLocaleString()}
                        </span>
                    )}
                    {startedAt && (
                        <span>
                            Started: {new Date(startedAt).toLocaleString()}
                        </span>
                    )}
                    {adjournedAt && (
                        <span>
                            Adjourned: {new Date(adjournedAt).toLocaleString()}
                        </span>
                    )}
                </div>
            </div>

            <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${pillClass(
                    status,
                )}`}
            >
                {status.replace("_", " ")}
            </span>
        </div>
    );
}
