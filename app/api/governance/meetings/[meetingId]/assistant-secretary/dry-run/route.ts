import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Database } from "@/database.types";
import { supabaseAdmin } from "@/utils/supabase/service-worker";
import {
    assistantSecretaryOutputSchema,
    extractAssistantSecretaryOutput,
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
const RUN_TYPE: GovernanceTables["agent_runs"]["Insert"]["run_type"] = "dry_run";
const dryRunRequestSchema = z.object({
    transcript: z.string().min(1).optional(),
}).strict();

function buildInputHash(meetingId: string, transcript: string): string {
    return createHash("sha256")
        .update(JSON.stringify({ meetingId, transcript }))
        .digest("hex");
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

// POST /api/governance/meetings/[meetingId]/assistant-secretary/dry-run
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

        const requestBody = dryRunRequestSchema.safeParse(rawBody);
        if (!requestBody.success) {
            return NextResponse.json(
                {
                    error: "Invalid dry-run payload",
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

        const output = extractAssistantSecretaryOutput({
            meetingId,
            transcript: transcriptText,
        });
        const validatedOutput = assistantSecretaryOutputSchema.parse(output);
        const inputHash = buildInputHash(meetingId, transcriptText);

        const runInsert: GovernanceTables["agent_runs"]["Insert"] = {
            meeting_id: meetingId,
            agent_name: AGENT_NAME,
            run_type: RUN_TYPE,
            input_hash: inputHash,
            input_payload: { transcript: transcriptText },
            output_payload: validatedOutput,
            status: "completed",
            created_by: access.userId,
        };

        const { data: agentRun, error: runError } = await supabaseAdmin
            .schema("governance")
            .from("agent_runs")
            .upsert(
                {
                    ...runInsert,
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: "agent_name,meeting_id,run_type,input_hash",
                },
            )
            .select("*")
            .maybeSingle();

        if (runError) {
            if (isMissingRelation(runError)) {
                return NextResponse.json(
                    {
                        input_hash: inputHash,
                        output: validatedOutput,
                        agent_run: null,
                        warnings: [
                            "governance.agent_runs table is missing; run metadata was not persisted.",
                        ],
                    },
                    { status: 200 },
                );
            }
            return NextResponse.json(
                { error: runError.message },
                { status: 400 },
            );
        }

        return NextResponse.json(
            {
                input_hash: inputHash,
                output: validatedOutput,
                agent_run: agentRun,
            },
            { status: 200 },
        );
    } catch (error: unknown) {
        return handleRouteError(error);
    }
}
