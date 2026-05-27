"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { AssistantSecretaryOutput } from "@/app/lib/governance/assistant-secretary";

async function getJSON<T>(url: string): Promise<T> {
    const res = await fetch(url, { method: "GET" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Request failed");
    return json as T;
}

async function postJSON<T>(url: string, body?: unknown): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Request failed");
    return json as T;
}

type DryRunResponse = {
    input_hash: string;
    output: AssistantSecretaryOutput;
};

type ApplyResponse = {
    idempotent: boolean;
    input_hash: string;
    output?: AssistantSecretaryOutput;
    result?: {
        minutes_id: string;
        inserted_motion_ids: string[];
        inserted_vote_count: number;
        inserted_action_item_ids: string[];
        warnings: string[];
    } | null;
};

export function MeetingAssistantSecretaryPanel(props: {
    meetingId: string;
    onApplied?: () => void;
}) {
    const { meetingId, onApplied } = props;
    const [transcript, setTranscript] = useState("");
    const [savedTranscript, setSavedTranscript] = useState("");
    const [loadingTranscript, setLoadingTranscript] = useState(true);
    const [savingTranscript, setSavingTranscript] = useState(false);
    const [dryRunning, setDryRunning] = useState(false);
    const [applying, setApplying] = useState(false);
    const [inputHash, setInputHash] = useState<string | null>(null);
    const [output, setOutput] = useState<AssistantSecretaryOutput | null>(null);
    const [applyResult, setApplyResult] = useState<ApplyResponse["result"]>(null);

    useEffect(() => {
        let active = true;
        async function loadTranscript() {
            setLoadingTranscript(true);
            try {
                const payload = await getJSON<{
                    transcript: { transcript: string } | null;
                }>(
                    `/api/governance/meetings/${meetingId}/transcript`,
                );
                if (!active) return;
                const value = payload.transcript?.transcript ?? "";
                setTranscript(value);
                setSavedTranscript(value);
            } catch (err: unknown) {
                const message = err instanceof Error
                    ? err.message
                    : "Failed to load transcript";
                toast.error(message);
            } finally {
                if (active) setLoadingTranscript(false);
            }
        }
        void loadTranscript();
        return () => {
            active = false;
        };
    }, [meetingId]);

    const hasUnsavedChanges = useMemo(
        () => transcript !== savedTranscript,
        [transcript, savedTranscript],
    );

    async function saveTranscript(showToast = true): Promise<boolean> {
        const trimmed = transcript.trim();
        if (!trimmed) {
            toast.error("Transcript is required");
            return false;
        }

        setSavingTranscript(true);
        try {
            const payload = await postJSON<{
                transcript: { transcript: string };
            }>(
                `/api/governance/meetings/${meetingId}/transcript`,
                { transcript: trimmed },
            );
            setSavedTranscript(payload.transcript.transcript);
            setTranscript(payload.transcript.transcript);
            if (showToast) toast.success("Transcript saved");
            return true;
        } catch (err: unknown) {
            const message = err instanceof Error
                ? err.message
                : "Failed to save transcript";
            toast.error(message);
            return false;
        } finally {
            setSavingTranscript(false);
        }
    }

    async function runDryRun() {
        const saved = await saveTranscript(false);
        if (!saved) return;

        setDryRunning(true);
        setApplyResult(null);
        try {
            const payload = await postJSON<DryRunResponse>(
                `/api/governance/meetings/${meetingId}/assistant-secretary/dry-run`,
                { transcript: transcript.trim() },
            );
            setInputHash(payload.input_hash);
            setOutput(payload.output);
            toast.success("Dry run complete");
        } catch (err: unknown) {
            const message = err instanceof Error
                ? err.message
                : "Dry run failed";
            toast.error(message);
        } finally {
            setDryRunning(false);
        }
    }

    async function applyOutput() {
        const saved = await saveTranscript(false);
        if (!saved) return;

        setApplying(true);
        try {
            const payload = await postJSON<ApplyResponse>(
                `/api/governance/meetings/${meetingId}/assistant-secretary/apply`,
                output
                    ? { output, transcript: transcript.trim() }
                    : { transcript: transcript.trim() },
            );
            setInputHash(payload.input_hash);
            if (payload.output) setOutput(payload.output);
            setApplyResult(payload.result ?? null);
            toast.success(payload.idempotent ? "Already applied" : "Applied");
            onApplied?.();
        } catch (err: unknown) {
            const message = err instanceof Error
                ? err.message
                : "Apply failed";
            toast.error(message);
        } finally {
            setApplying(false);
        }
    }

    return (
        <div className="border rounded p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">Assistant Secretary (Phase 1)</div>
                {inputHash && (
                    <code className="text-xs text-brand-secondary-0">
                        input_hash: {inputHash.slice(0, 12)}...
                    </code>
                )}
            </div>

            {loadingTranscript ? (
                <div className="text-sm text-brand-secondary-0">
                    Loading transcript...
                </div>
            ) : (
                <textarea
                    className="w-full min-h-[180px] border rounded p-3 font-mono text-sm"
                    placeholder="Paste meeting transcript here..."
                    value={transcript}
                    onChange={(event) => setTranscript(event.target.value)}
                />
            )}

            <div className="flex flex-wrap gap-2">
                <button
                    className="px-3 py-2 rounded bg-brand-secondary-1 text-brand-primary-1 disabled:bg-brand-secondary-2"
                    disabled={savingTranscript || loadingTranscript || !transcript.trim()}
                    onClick={() => {
                        void saveTranscript(true);
                    }}
                >
                    {savingTranscript ? "Saving..." : "Save Transcript"}
                </button>
                <button
                    className="px-3 py-2 rounded bg-brand-secondary-2 disabled:bg-brand-secondary-2"
                    disabled={dryRunning || savingTranscript || !transcript.trim()}
                    onClick={() => {
                        void runDryRun();
                    }}
                >
                    {dryRunning ? "Running..." : "Dry Run"}
                </button>
                <button
                    className="px-3 py-2 rounded bg-brand-primary-0 text-brand-primary-1 disabled:bg-brand-secondary-2"
                    disabled={applying || savingTranscript || !transcript.trim()}
                    onClick={() => {
                        void applyOutput();
                    }}
                >
                    {applying ? "Applying..." : "Apply"}
                </button>
                {hasUnsavedChanges && (
                    <span className="text-sm text-amber-700 self-center">
                        Unsaved changes
                    </span>
                )}
            </div>

            {output && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="text-sm font-semibold">Extracted Motions</div>
                        <div className="max-h-80 overflow-auto rounded border p-3 space-y-2 text-sm">
                            {output.motions.length === 0 && (
                                <div className="text-brand-secondary-0">
                                    No motions detected.
                                </div>
                            )}
                            {output.motions.map((motion, index) => (
                                <div key={`${motion.title}-${index}`} className="border-b pb-2 last:border-b-0">
                                    <div className="font-medium">{motion.title}</div>
                                    <div className="text-xs text-brand-secondary-0">
                                        moved: {motion.moved_by ?? "unknown"} | seconded:{" "}
                                        {motion.seconded_by ?? "unknown"}
                                    </div>
                                    <div className="text-xs text-brand-secondary-0">
                                        outcome: {motion.vote.outcome}
                                        {motion.vote.yes !== null &&
                                            ` | yes ${motion.vote.yes}`}
                                        {motion.vote.no !== null &&
                                            ` | no ${motion.vote.no}`}
                                        {motion.vote.abstain !== null &&
                                            ` | abstain ${motion.vote.abstain}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="text-sm font-semibold">Minutes Preview</div>
                        <pre className="max-h-80 overflow-auto rounded border bg-brand-secondary-2 p-3 text-xs whitespace-pre-wrap">
                            {output.minutes.content_md}
                        </pre>
                    </div>
                </div>
            )}

            {applyResult && (
                <div className="rounded border bg-brand-secondary-2 p-3 text-sm space-y-1">
                    <div>Minutes upserted: {applyResult.minutes_id}</div>
                    <div>Motions inserted: {applyResult.inserted_motion_ids.length}</div>
                    <div>Votes inserted: {applyResult.inserted_vote_count}</div>
                    <div>Action items inserted: {applyResult.inserted_action_item_ids.length}</div>
                    {applyResult.warnings.length > 0 && (
                        <div className="text-amber-800">
                            {applyResult.warnings.join(" ")}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
