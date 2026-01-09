// DEPRECATED: Prefer /api/entities/[id]/governance/* for entity-scoped workflows.
import { NextResponse } from "next/server";
import { createApproval } from "@/app/data/governance-dto";
import { safeRoute } from "@/app/lib/api/handler";
import { isPlatformAdminServer } from "@/app/lib/auth/platformAdmin";

export async function POST(req: Request) {
    return safeRoute(async () => {
        const body = await req.json();
        const elevated = await isPlatformAdminServer();
        const created = await createApproval(body, { elevated });
        return NextResponse.json(created, { status: 201 });
    });
}
