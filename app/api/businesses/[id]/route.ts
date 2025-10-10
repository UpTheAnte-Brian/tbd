// export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { getBusiness } from "@/app/data/businesses-dto";

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
        const receipts = await getBusiness(id);
        return NextResponse.json(receipts);
    } catch (err) {
        console.error("Error fetching receipts:", err);
        return NextResponse.json(
            { error: "Unable to fetch receipts" },
            { status: 500 },
        );
    }
}
