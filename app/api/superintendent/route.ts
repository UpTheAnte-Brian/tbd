import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { getSuperintendentDashboardDTO } from "@/domain/superintendent/superintendent-dto";

export async function GET(request: NextRequest) {
    const districtEntityIdRaw = request.nextUrl.searchParams.get(
        "districtEntityId",
    );
    const districtEntityId = districtEntityIdRaw?.trim() || null;

    return safeRoute(async () => {
        const data = await getSuperintendentDashboardDTO(districtEntityId);
        return NextResponse.json(data);
    });
}
