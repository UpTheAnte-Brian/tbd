import { type NextRequest, NextResponse } from "next/server";
import { getDistrictDTO } from "../../../../app/data/districts-dto";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    if (!id) {
        return NextResponse.json({ error: "Missing district ID" }, {
            status: 400,
        });
    }

    try {
        const district = await getDistrictDTO(id);
        return NextResponse.json(district, { status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 404 });
    }
}
