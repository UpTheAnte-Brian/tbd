import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { getSuperintendentDashboardDTO } from "@/domain/superintendent/superintendent-dto";

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

        const data = await getSuperintendentDashboardDTO(districtEntityId);
        return NextResponse.json(data);
    });
}
