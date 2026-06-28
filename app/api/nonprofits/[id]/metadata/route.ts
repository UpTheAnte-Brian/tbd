import { type NextRequest, NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
    return safeRoute(async () => {
        // Foundation metadata table has been removed; acknowledge request without DB mutation.
        const body = await req.json();
        const { id } = await params;
        return NextResponse.json({
            success: true,
            message: "Foundation metadata table removed; no changes applied.",
            received: { id, ...body },
        });
    });
}
