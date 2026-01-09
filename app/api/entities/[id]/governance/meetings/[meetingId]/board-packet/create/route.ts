// CANONICAL: Entity-scoped governance endpoint.
import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";
import type { CreateBoardPacketResponse } from "@/app/lib/types/governance-approvals";

interface RouteParams {
    params: Promise<{ id: string; meetingId: string }>;
}

function mapRpcErrorStatus(message: string): number {
    const normalized = message.toLowerCase();
    if (normalized.includes("not authorized")) return 403;
    if (normalized.includes("not found")) return 404;
    if (normalized.includes("already exists")) return 409;
    return 400;
}

async function meetingMatchesEntity(
    supabase: Awaited<ReturnType<typeof createApiClient>>,
    meetingId: string,
    entityId: string,
): Promise<boolean> {
    const { data, error } = await supabase
        .schema("governance")
        .from("board_meetings")
        .select("id, board:boards(entity_id)")
        .eq("id", meetingId)
        .maybeSingle();

    if (error) throw error;
    const board = (data?.board ?? null) as { entity_id?: string } | null;
    return Boolean(board?.entity_id && board.entity_id === entityId);
}

// POST /api/entities/[id]/governance/meetings/[meetingId]/board-packet/create
export async function POST(req: NextRequest, context: RouteParams) {
    const supabase = await createApiClient();
    const { id: entityKey, meetingId } = await context.params;

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let entityId: string;
    try {
        entityId = await resolveEntityId(supabase, entityKey);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Entity not found";
        return NextResponse.json({ error: message }, { status: 404 });
    }

    try {
        const matches = await meetingMatchesEntity(
            supabase,
            meetingId,
            entityId,
        );
        if (!matches) {
            return NextResponse.json(
                { error: "Meeting not found" },
                { status: 404 },
            );
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Invalid meeting";
        return NextResponse.json({ error: message }, { status: 400 });
    }

    let body: { title?: string } = {};
    const rawBody = await req.text();
    if (rawBody) {
        try {
            body = JSON.parse(rawBody) as { title?: string };
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, {
                status: 400,
            });
        }
    }

    const { data, error } = await supabase
        .schema("governance")
        .rpc("create_board_packet_for_meeting", {
            p_meeting_id: meetingId,
            p_title: body.title ?? undefined,
        });

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: mapRpcErrorStatus(error.message) },
        );
    }

    if (!data) {
        return NextResponse.json(
            { error: "Board packet not created" },
            { status: 500 },
        );
    }

    // Supabase RPC types often come through as `Json` (string | number | boolean | object | array),
    // so we need to narrow safely before reading properties.
    const raw = Array.isArray(data) ? data[0] : data;

    const asRecord = (v: unknown): Record<string, unknown> | null => {
        if (!v || typeof v !== "object") return null;
        if (Array.isArray(v)) return null;
        return v as Record<string, unknown>;
    };

    const rec = asRecord(raw);
    const documentId =
        (typeof rec?.document_id === "string" ? rec.document_id : undefined) ??
            (typeof rec?.documentId === "string"
                ? rec.documentId
                : undefined) ??
            null;
    const versionId =
        (typeof rec?.version_id === "string" ? rec.version_id : undefined) ??
            (typeof rec?.versionId === "string" ? rec.versionId : undefined) ??
            null;

    if (!documentId || !versionId) {
        return NextResponse.json(
            { error: "Board packet response missing ids" },
            { status: 500 },
        );
    }

    const response: CreateBoardPacketResponse = {
        documentId,
        versionId,
    };

    return NextResponse.json(response, { status: 200 });
}
