// CANONICAL: Entity-scoped governance endpoint.
import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";
import type { UpdateBoardPacketContentRequest } from "@/app/lib/types/governance-approvals";

interface RouteParams {
    params: Promise<{ id: string; meetingId: string }>;
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

async function isAuthorizedForEntity(
    supabase: Awaited<ReturnType<typeof createApiClient>>,
    entityId: string,
    userId: string,
): Promise<boolean> {
    const [globalAdmin, entityAdmin, boardChair] = await Promise.all([
        supabase.rpc("is_global_admin", { p_user_id: userId }),
        supabase.rpc("is_entity_admin", {
            p_entity_id: entityId,
            p_user_id: userId,
        }),
        supabase
            .schema("governance")
            .rpc("is_board_chair", { p_entity_id: entityId, p_user_id: userId }),
    ]);

    if (globalAdmin.error || entityAdmin.error || boardChair.error) {
        throw new Error("Authorization check failed");
    }

    return Boolean(globalAdmin.data || entityAdmin.data || boardChair.data);
}

// POST /api/entities/[id]/governance/meetings/[meetingId]/board-packet/update-content
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

    let body: UpdateBoardPacketContentRequest = {
        documentVersionId: "",
        contentMd: "",
    };
    const rawBody = await req.text();
    if (rawBody) {
        try {
            body = JSON.parse(rawBody) as UpdateBoardPacketContentRequest;
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }
    }

    const documentVersionId =
        typeof body.documentVersionId === "string"
            ? body.documentVersionId.trim()
            : "";
    const contentMd =
        typeof body.contentMd === "string" ? body.contentMd : null;

    if (!documentVersionId || contentMd === null) {
        return NextResponse.json(
            { error: "documentVersionId and contentMd are required" },
            { status: 400 },
        );
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

    try {
        const allowed = await isAuthorizedForEntity(
            supabase,
            entityId,
            user.id,
        );
        if (!allowed) {
            return NextResponse.json(
                { error: "Not authorized" },
                { status: 403 },
            );
        }
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Authorization failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }

    const { data: version, error: versionError } = await supabase
        .from("document_versions")
        .select(
            "id, status, documents:document_versions_document_id_fkey!inner(entity_id)",
        )
        .eq("id", documentVersionId)
        .eq("documents.entity_id", entityId)
        .maybeSingle();

    if (versionError) {
        return NextResponse.json(
            { error: versionError.message },
            { status: 400 },
        );
    }

    if (!version?.id) {
        return NextResponse.json(
            { error: "Document version not found" },
            { status: 404 },
        );
    }

    const status = (version as { status?: string | null }).status ?? null;
    if (status !== "draft") {
        return NextResponse.json(
            { error: "Document version is not editable" },
            { status: 409 },
        );
    }

    const { data: updated, error: updateError } = await supabase
        .from("document_versions")
        .update({ content_md: contentMd })
        .eq("id", documentVersionId)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();

    if (updateError) {
        return NextResponse.json(
            { error: updateError.message },
            { status: 400 },
        );
    }

    if (!updated?.id) {
        return NextResponse.json(
            { error: "Document version is not editable" },
            { status: 409 },
        );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
}
