/// app/api/nonprofits/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { createNonprofitDTO, listNonprofitDTO } from "@/domain/nonprofits/nonprofit-dto";

export async function GET() {
    return safeRoute(async () => {
        const nonprofits = await listNonprofitDTO();
        return NextResponse.json<typeof nonprofits>(nonprofits);
    });
}

export async function POST(req: NextRequest) {
    return safeRoute(async () => {
        const body = await req.json();

        if (!body.name || !body.org_type) {
            return NextResponse.json(
                { error: "name and org_type are required" },
                { status: 400 },
            );
        }

        const created = await createNonprofitDTO(body);
        return NextResponse.json<typeof created>(created, { status: 201 });
    });
}
