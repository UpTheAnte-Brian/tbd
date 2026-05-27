import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    AssistantSecretaryRouteError,
    getMeetingTranscript,
    requireMeetingWriteAccess,
    upsertMeetingTranscript,
} from "@/app/lib/governance/assistant-secretary-server";

interface RouteParams {
    params: Promise<{ meetingId: string }>;
}

const transcriptRequestSchema = z.object({
    transcript: z.string().min(1, "transcript is required"),
}).strict();

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

// GET /api/governance/meetings/[meetingId]/transcript
export async function GET(_req: NextRequest, context: RouteParams) {
    try {
        const { meetingId } = await context.params;
        await requireMeetingWriteAccess(meetingId);
        const transcript = await getMeetingTranscript(meetingId);
        return NextResponse.json({ transcript }, { status: 200 });
    } catch (error: unknown) {
        return handleRouteError(error);
    }
}

// POST /api/governance/meetings/[meetingId]/transcript
export async function POST(req: NextRequest, context: RouteParams) {
    try {
        const { meetingId } = await context.params;
        const access = await requireMeetingWriteAccess(meetingId);

        let rawBody: unknown;
        try {
            rawBody = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = transcriptRequestSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid transcript payload",
                    details: parsed.error.flatten(),
                },
                { status: 400 },
            );
        }

        const saved = await upsertMeetingTranscript({
            meetingId,
            transcript: parsed.data.transcript,
            userId: access.userId,
        });

        return NextResponse.json({ transcript: saved }, { status: 200 });
    } catch (error: unknown) {
        return handleRouteError(error);
    }
}
