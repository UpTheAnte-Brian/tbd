"use client";

import {
    isMeetingLockedForVotes,
    VOTE_VALUE,
    type VoteValue,
} from "@/domain/governance/constants";
import type { MeetingDTO, MotionDTO, VoteDTO } from "./types";
import toast from "react-hot-toast";
import { useMemo, useState } from "react";

async function getJSON<T>(url: string): Promise<T> {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Request failed");
    return json as T;
}

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

export function MotionVotePanel(props: {
    entityId: string;
    meeting: MeetingDTO;
    motion: MotionDTO;
    myUserId?: string;
}) {
    const { entityId, meeting, motion, myUserId } = props;
    const [votes, setVotes] = useState<VoteDTO[]>([]);
    const [loading, setLoading] = useState(false);

    const locked = isMeetingLockedForVotes(meeting.status);

    const myVote = useMemo(() => {
        if (!myUserId) return undefined;
        return votes.find((vote) => vote.user_id === myUserId);
    }, [votes, myUserId]);

    const counts = useMemo(() => {
        const tally = { yes: 0, no: 0, abstain: 0 };
        for (const vote of votes) {
            tally[vote.value] = (tally[vote.value] ?? 0) + 1;
        }
        return tally;
    }, [votes]);

    async function refresh() {
        setLoading(true);
        try {
            const data = await getJSON<{ votes: VoteDTO[] }>(
                `/api/entities/${entityId}/governance/motions/${motion.id}/votes`,
            );
            setVotes(data.votes);
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Failed to load votes";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }

    async function cast(value: VoteValue) {
        if (locked) return;
        try {
            await putJSON(
                `/api/entities/${entityId}/governance/motions/${motion.id}/votes`,
                { value },
            );
            toast.success("Vote saved");
            await refresh();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Vote rejected";
            toast.error(message);
        }
    }

    return (
        <div className="border rounded p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="font-semibold">{motion.title}</div>
                    <div className="text-sm text-slate-600">
                        Status: {motion.status}
                    </div>
                </div>

                <button
                    className="px-3 py-2 rounded bg-slate-100"
                    onClick={refresh}
                    disabled={loading}
                >
                    Refresh votes
                </button>
            </div>

            {locked && (
                <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                    This meeting is {meeting.status}. Votes are immutable.
                </div>
            )}

            <div className="flex gap-2">
                <button
                    className="px-3 py-2 rounded bg-green-700 text-white disabled:bg-slate-300"
                    disabled={locked}
                    onClick={() => cast(VOTE_VALUE.YES)}
                >
                    Yes
                </button>
                <button
                    className="px-3 py-2 rounded bg-red-700 text-white disabled:bg-slate-300"
                    disabled={locked}
                    onClick={() => cast(VOTE_VALUE.NO)}
                >
                    No
                </button>
                <button
                    className="px-3 py-2 rounded bg-slate-700 text-white disabled:bg-slate-300"
                    disabled={locked}
                    onClick={() => cast(VOTE_VALUE.ABSTAIN)}
                >
                    Abstain
                </button>
            </div>

            <div className="text-sm text-slate-700">
                Your vote:{" "}
                <span className="font-medium">
                    {myVote?.value ?? "(none)"}
                </span>
            </div>

            <div className="text-sm text-slate-700 flex gap-4">
                <span>Yes: {counts.yes}</span>
                <span>No: {counts.no}</span>
                <span>Abstain: {counts.abstain}</span>
            </div>

            <div className="pt-2 border-t text-sm">
                <div className="font-medium mb-1">Vote log</div>
                <ul className="space-y-1">
                    {votes.map((vote) => (
                        <li key={vote.id} className="flex justify-between">
                            <span className="text-slate-600 truncate">
                                {vote.user_id ?? "(anonymous)"}
                            </span>
                            <span className="font-medium">{vote.value}</span>
                        </li>
                    ))}
                    {votes.length === 0 && (
                        <li className="text-slate-500">No votes yet</li>
                    )}
                </ul>
            </div>
        </div>
    );
}
