import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";
import type {
    ApproveMinutesRequest,
    ApproveMinutesResponse,
} from "@/app/lib/types/governance-approvals";

interface RouteParams {
    params: Promise<{ id: string; meetingId: string }>;
}

function getRequestIp(req: NextRequest): string | null {
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const first = forwardedFor.split(",")[0]?.trim();
        if (first) return first;
    }
    return req.headers.get("x-real-ip");
}

function mapRpcErrorStatus(message: string): number {
    const normalized = message.toLowerCase();
    if (normalized.includes("not authorized")) return 403;
    if (normalized.includes("must be an active board member")) return 403;
    if (normalized.includes("not found") || normalized.includes("no minutes")) {
        return 404;
    }
    if (normalized.includes("already approved")) return 409;
    return 400;
}

// POST /api/entities/[id]/governance/meetings/[meetingId]/minutes/approve
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

    let body: ApproveMinutesRequest = {};
    const rawBody = await req.text();
    if (rawBody) {
        try {
            body = JSON.parse(rawBody) as ApproveMinutesRequest;
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }
    }

    const signatureHash = body.signatureHash ?? undefined;
    const approvalMethod = body.approvalMethod ?? "in_app";
    const ip = getRequestIp(req) ?? undefined;

    const { data, error } = await supabase
        .schema("governance")
        .rpc("approve_meeting_minutes", {
            p_meeting_id: meetingId,
            p_signature_hash: signatureHash,
            p_approval_method: approvalMethod,
            p_ip: ip,
        });

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: mapRpcErrorStatus(error.message) },
        );
    }

    if (!data) {
        return NextResponse.json(
            { error: "Approval not created" },
            { status: 500 },
        );
    }

    const approvalId = typeof data === "string" ? data : String(data);
    const response: ApproveMinutesResponse = {
        entityId,
        meetingId,
        approvalId,
    };

    return NextResponse.json(response, { status: 200 });
}
