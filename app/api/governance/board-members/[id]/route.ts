// DEPRECATED (global): Prefer /api/entities/[id]/governance/* for entity-scoped workflows.
import { NextResponse } from "next/server";
import {
    removeBoardMember,
    updateBoardMember,
} from "@/app/data/governance-dto";
import { safeRoute } from "@/app/lib/api/handler";
import { isPlatformAdminServer } from "@/app/lib/auth/platformAdmin";

interface RouteParams {
    params: Promise<{ id: string }>;
}
function asMaybePostgresError(
    err: unknown,
): { code?: string; message?: string } {
    if (typeof err !== "object" || err === null) return {};

    let code: string | undefined;
    let message: string | undefined;

    if ("code" in err) {
        const value = (err as { code?: unknown }).code;
        if (typeof value === "string") {
            code = value;
        }
    }

    if ("message" in err) {
        const value = (err as { message?: unknown }).message;
        if (typeof value === "string") {
            message = value;
        }
    }

    return { code, message };
}

export async function PATCH(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { id } = await context.params;
        const body = await req.json();
        const elevated = await isPlatformAdminServer();
        const updated = await updateBoardMember(id, body, { elevated });
        return NextResponse.json(updated);
    });
}

export async function DELETE(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { id } = await context.params;
        const elevated = await isPlatformAdminServer();

        try {
            await removeBoardMember(id, { elevated });
            return NextResponse.json({ success: true });
        } catch (err) {
            const pg = asMaybePostgresError(err);

            // FK violation: votes still reference this board member.
            if (pg.code === "23503") {
                return NextResponse.json(
                    {
                        error: "BOARD_MEMBER_HAS_VOTES",
                        message:
                            "This board member cannot be deleted because votes reference them. End their term instead of deleting.",
                    },
                    { status: 409 },
                );
            }

            // Re-throw so safeRoute preserves existing behavior for all other failures
            throw err;
        }
    });
}
