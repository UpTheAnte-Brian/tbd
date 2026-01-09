// CANONICAL: Entity-scoped governance endpoint.
import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";
import type {
    FinalizeMotionRequest,
    FinalizeMotionResponse,
} from "@/app/lib/types/governance-approvals";

interface RouteParams {
    params: Promise<{ id: string; motionId: string }>;
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
    if (normalized.includes("not found") || normalized.includes("no motion")) {
        return 404;
    }
    if (normalized.includes("already finalized")) return 409;
    return 400;
}

// POST /api/entities/[id]/governance/motions/[motionId]/finalize
export async function POST(req: NextRequest, context: RouteParams) {
    const supabase = await createApiClient();
    const { id: entityKey, motionId } = await context.params;

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

    let body: FinalizeMotionRequest = {
        signatureHash: "",
    };
    const rawBody = await req.text();
    if (rawBody) {
        try {
            body = JSON.parse(rawBody) as FinalizeMotionRequest;
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, {
                status: 400,
            });
        }
    }

    if (!body.signatureHash?.trim()) {
        return NextResponse.json(
            { error: "signatureHash is required" },
            { status: 400 },
        );
    }

    const signatureHash = body.signatureHash.trim();
    const approvalMethod = body.approvalMethod ?? "clickwrap";
    const ip = getRequestIp(req);

    const { data, error } = await supabase.schema("governance").rpc(
        "finalize_motion",
        {
            p_motion_id: motionId,
            p_signature_hash: signatureHash,
            p_approval_method: approvalMethod,
            p_ip: ip,
        },
    );

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
    const response: FinalizeMotionResponse = {
        entityId,
        motionId,
        approvalId,
    };

    return NextResponse.json(response, { status: 200 });
}
