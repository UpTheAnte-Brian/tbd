// export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { getBusiness } from "@/domain/businesses/businesses-dto";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    // rest of your code
    if (!id) {
        return NextResponse.json({ error: "Missing business ID" }, {
            status: 400,
        });
    }

    try {
        const business = await getBusiness(id);
        return NextResponse.json(business);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const status = message === "Business not found" ? 404 : 500;
        console.error("Error fetching business:", err);
        return NextResponse.json({ error: message }, { status });
    }
}
