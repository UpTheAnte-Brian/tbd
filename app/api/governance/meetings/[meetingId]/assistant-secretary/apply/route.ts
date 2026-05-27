import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Database } from "@/database.types";
import { supabaseAdmin } from "@/utils/supabase/service-worker";
import {
    assistantSecretaryOutputSchema,
    extractAssistantSecretaryOutput,
    validateAssistantSecretaryOutput,
    type AssistantSecretaryMotion,
    type AssistantSecretaryOutput,
} from "@/app/lib/governance/assistant-secretary";
import {
    AssistantSecretaryRouteError,
    getMeetingTranscript,
    requireMeetingWriteAccess,
} from "@/app/lib/governance/assistant-secretary-server";

interface RouteParams {
    params: Promise<{ meetingId: string }>;
}

type GovernanceTables = Database["governance"]["Tables"];

const AGENT_NAME = "assistant_secretary";
const RUN_TYPE: GovernanceTables["agent_runs"]["Insert"]["run_type"] = "apply";

const applyRequestSchema = z.object({
    transcript: z.string().min(1).optional(),
    output: z.unknown().optional(),
}).strict();

function buildInputHash(meetingId: string, transcript: string): string {
    return createHash("sha256")
        .update(JSON.stringify({ meetingId, transcript }))
        .digest("hex");
}

function mapMotionStatus(
    outcome: AssistantSecretaryMotion["vote"]["outcome"],
): string {
    if (outcome === "failed") return "failed";
    if (outcome === "approved" || outcome === "passed") return "passed";
    return "pending";
}

function buildVoteRows(
    motionId: string,
    motion: AssistantSecretaryMotion,
): GovernanceTables["votes"]["Insert"][] {
    const rows: GovernanceTables["votes"]["Insert"][] = [];
    const yesCount = motion.vote.yes ?? 0;
    const noCount = motion.vote.no ?? 0;
    const abstainCount = motion.vote.abstain ?? 0;

    for (let i = 0; i < yesCount; i += 1) {
        rows.push({
            motion_id: motionId,
            board_member_id: null,
            user_id: null,
            vote: "yes",
            vote_value: "yes",
        });
    }
    for (let i = 0; i < noCount; i += 1) {
        rows.push({
            motion_id: motionId,
            board_member_id: null,
            user_id: null,
            vote: "no",
            vote_value: "no",
        });
    }
    for (let i = 0; i < abstainCount; i += 1) {
        rows.push({
            motion_id: motionId,
            board_member_id: null,
            user_id: null,
            vote: "abstain",
            vote_value: "abstain",
        });
    }

    return rows;
}

function handleRouteError(error: unknown) {
    if (error instanceof AssistantSecretaryRouteError) {
        return NextResponse.json(
            { error: error.message },
            { status: error.status },
        );
    }
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
}

function isMissingRelation(error: { code?: string | null; message?: string | null }): boolean {
    if (error.code === "42P01") return true;
    const message = (error.message ?? "").toLowerCase();
    return message.includes("does not exist") && message.includes("relation");
}

async function resolveApplyOutput(params: {
    bodyOutput: unknown;
    meetingId: string;
    transcript: string;
}): Promise<AssistantSecretaryOutput> {
    if (params.bodyOutput !== undefined) {
        const parsed = validateAssistantSecretaryOutput(params.bodyOutput);
        if (!parsed.success) {
            throw new AssistantSecretaryRouteError(
                JSON.stringify(parsed.error.flatten()),
                422,
            );
        }
        if (parsed.data.meeting_id !== params.meetingId) {
            throw new AssistantSecretaryRouteError(
                "output.meeting_id must match route meetingId",
                400,
            );
        }
        return parsed.data;
    }

    const output = extractAssistantSecretaryOutput({
        meetingId: params.meetingId,
        transcript: params.transcript,
    });
    return assistantSecretaryOutputSchema.parse(output);
}

// POST /api/governance/meetings/[meetingId]/assistant-secretary/apply
export async function POST(req: Request, context: RouteParams) {
    try {
        const { meetingId } = await context.params;
        const access = await requireMeetingWriteAccess(meetingId);

        let rawBody: unknown = {};
        try {
            const textBody = await req.text();
            rawBody = textBody ? JSON.parse(textBody) : {};
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const requestBody = applyRequestSchema.safeParse(rawBody);
        if (!requestBody.success) {
            return NextResponse.json(
                {
                    error: "Invalid apply payload",
                    details: requestBody.error.flatten(),
                },
                { status: 400 },
            );
        }

        const storedTranscript = await getMeetingTranscript(meetingId);
        const transcriptText = requestBody.data.transcript?.trim() ||
            storedTranscript?.transcript?.trim() ||
            "";
        if (!transcriptText) {
            return NextResponse.json(
                {
                    error:
                        "No transcript found for this meeting. Save a transcript first.",
                },
                { status: 404 },
            );
        }

        const inputHash = buildInputHash(meetingId, transcriptText);
        const { data: existingRun, error: existingRunError } = await supabaseAdmin
            .schema("governance")
            .from("agent_runs")
            .select("*")
            .eq("meeting_id", meetingId)
            .eq("agent_name", AGENT_NAME)
            .eq("run_type", RUN_TYPE)
            .eq("input_hash", inputHash)
            .maybeSingle();

        if (existingRunError) {
            if (isMissingRelation(existingRunError)) {
                // Compatibility mode: agent_runs table not present in this DB.
            } else {
                return NextResponse.json(
                    { error: existingRunError.message },
                    { status: 400 },
                );
            }
        }

        // Idempotency: never apply the same input_hash more than once.
        if (existingRun) {
            return NextResponse.json(
                {
                    idempotent: true,
                    input_hash: inputHash,
                    agent_run: existingRun,
                    result: existingRun.result_payload ?? null,
                },
                { status: 200 },
            );
        }

        const output = await resolveApplyOutput({
            bodyOutput: requestBody.data.output,
            meetingId,
            transcript: transcriptText,
        });

        const runInsert: GovernanceTables["agent_runs"]["Insert"] = {
            meeting_id: meetingId,
            agent_name: AGENT_NAME,
            run_type: RUN_TYPE,
            input_hash: inputHash,
            input_payload: { transcript: transcriptText },
            output_payload: output,
            status: "pending",
            created_by: access.userId,
        };

        let createdRun: GovernanceTables["agent_runs"]["Row"] | null = null;
        let agentRunsMissing = false;
        const { data: maybeCreatedRun, error: runInsertError } = await supabaseAdmin
            .schema("governance")
            .from("agent_runs")
            .insert(runInsert)
            .select("*")
            .maybeSingle();

        if (runInsertError) {
            if (isMissingRelation(runInsertError)) {
                agentRunsMissing = true;
            } else {
                return NextResponse.json(
                    { error: runInsertError.message },
                    { status: 400 },
                );
            }
        } else if (maybeCreatedRun?.id) {
            createdRun = maybeCreatedRun;
        }

        try {
            const minutesPayload: GovernanceTables["meeting_minutes"]["Insert"] = {
                meeting_id: meetingId,
                content_md: output.minutes.content_md,
                content: output.minutes.content_md,
                status: "draft",
                draft: true,
            };

            const { data: minutes, error: minutesError } = await supabaseAdmin
                .schema("governance")
                .from("meeting_minutes")
                .upsert(minutesPayload, { onConflict: "meeting_id" })
                .select("id")
                .single();

            if (minutesError || !minutes?.id) {
                throw new Error(minutesError?.message ?? "Failed to upsert minutes");
            }

            const insertedMotionIds: string[] = [];
            let insertedVotes = 0;
            const warnings: string[] = [];
            if (agentRunsMissing) {
                warnings.push(
                    "governance.agent_runs table is missing; run metadata was not persisted.",
                );
            }

            for (const motion of output.motions) {
                const motionPayload: GovernanceTables["motions"]["Insert"] = {
                    meeting_id: meetingId,
                    title: motion.title,
                    status: mapMotionStatus(motion.vote.outcome),
                };
                const { data: insertedMotion, error: motionError } =
                    await supabaseAdmin
                        .schema("governance")
                        .from("motions")
                        .insert(motionPayload)
                        .select("id")
                        .single();

                if (motionError || !insertedMotion?.id) {
                    throw new Error(
                        motionError?.message ?? "Failed to insert extracted motion",
                    );
                }
                insertedMotionIds.push(insertedMotion.id);

                const voteRows = buildVoteRows(insertedMotion.id, motion);
                if (voteRows.length === 0) continue;

                const { error: voteError } = await supabaseAdmin
                    .schema("governance")
                    .from("votes")
                    .insert(voteRows);

                if (voteError) {
                    const normalized = voteError.message.toLowerCase();
                    const isNullableMismatch = normalized.includes("board_member") &&
                        normalized.includes("null");
                    if (isNullableMismatch) {
                        warnings.push(
                            "Votes were detected but skipped because votes.board_member_id requires non-null values in this environment.",
                        );
                    } else {
                        throw new Error(voteError.message);
                    }
                } else {
                    insertedVotes += voteRows.length;
                }
            }

            const actionItemRows: GovernanceTables["action_items"]["Insert"][] =
                output.action_items.map((item) => ({
                    meeting_id: meetingId,
                    agent_run_id: createdRun?.id ?? null,
                    description: item.description,
                    owner_name: item.owner_name,
                    due_date: item.due_date,
                    status: "open",
                    source_line_number: item.source_line_number,
                    source_excerpt: item.source_excerpt,
                }));

            let insertedActionItemIds: string[] = [];
            if (actionItemRows.length > 0) {
                const { data: actionItems, error: actionItemError } =
                    await supabaseAdmin
                        .schema("governance")
                        .from("action_items")
                        .insert(actionItemRows)
                        .select("id");

                if (actionItemError) {
                    if (isMissingRelation(actionItemError)) {
                        warnings.push(
                            "governance.action_items table is missing; action items were not persisted.",
                        );
                    } else {
                        throw new Error(actionItemError.message);
                    }
                }
                if (!actionItemError) {
                    insertedActionItemIds = (actionItems ?? [])
                        .map((row) => row.id)
                        .filter((id): id is string => Boolean(id));
                }
            }

            const resultPayload = {
                minutes_id: minutes.id,
                inserted_motion_ids: insertedMotionIds,
                inserted_vote_count: insertedVotes,
                inserted_action_item_ids: insertedActionItemIds,
                warnings,
            };

            let finalizedRun: GovernanceTables["agent_runs"]["Row"] | null =
                createdRun;
            if (createdRun?.id) {
                const { data: updatedRun, error: updateRunError } = await supabaseAdmin
                    .schema("governance")
                    .from("agent_runs")
                    .update({
                        status: "applied",
                        output_payload: output,
                        result_payload: resultPayload,
                        applied_minutes_id: minutes.id,
                        updated_at: new Date().toISOString(),
                        error_message: null,
                    })
                    .eq("id", createdRun.id)
                    .select("*")
                    .maybeSingle();

                if (updateRunError && !isMissingRelation(updateRunError)) {
                    throw new Error(updateRunError.message);
                }
                if (updatedRun) {
                    finalizedRun = updatedRun;
                }
            }

            return NextResponse.json(
                {
                    idempotent: false,
                    input_hash: inputHash,
                    output,
                    result: resultPayload,
                    agent_run: finalizedRun,
                },
                { status: 200 },
            );
        } catch (applyError: unknown) {
            const message = applyError instanceof Error
                ? applyError.message
                : "Apply failed";
            if (createdRun?.id) {
                await supabaseAdmin
                    .schema("governance")
                    .from("agent_runs")
                    .update({
                        status: "failed",
                        error_message: message,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", createdRun.id);
            }

            return NextResponse.json({ error: message }, { status: 400 });
        }
    } catch (error: unknown) {
        return handleRouteError(error);
    }
}
