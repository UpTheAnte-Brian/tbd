import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { createApiClient } from "@/utils/supabase/route";
import { requireEntityAdmin, requireGlobalAdmin } from "@/app/lib/server/rbac";
import { getSuperintendentDashboardDTO } from "@/domain/superintendent/superintendent-dto";

async function assertDistrictAccess(districtEntityId: string) {
    const supabase = await createApiClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
        throw new Error("Unauthorized");
    }

    try {
        await requireEntityAdmin({
            supabase,
            userId: data.user.id,
            entityId: districtEntityId,
        });
        return;
    } catch {
        await requireGlobalAdmin(supabase, data.user);
    }
}

export async function GET(request: NextRequest) {
    const districtEntityIdRaw = request.nextUrl.searchParams.get(
        "districtEntityId",
    );
    const districtEntityId = districtEntityIdRaw?.trim() || null;

    return safeRoute(async () => {
        if (!districtEntityId) {
            return NextResponse.json(
                { error: "districtEntityId is required" },
                { status: 400 },
            );
        }

        try {
            await assertDistrictAccess(districtEntityId);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unauthorized";
            const status = message === "Unauthorized" ? 401 : 403;
            return NextResponse.json({ error: message }, { status });
        }

        const data = await getSuperintendentDashboardDTO(districtEntityId);
        return NextResponse.json(data);
    });
}
