// export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "../../../../utils/supabase/server";
import { getBusiness } from "@/app/data/businesses-dto";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    // rest of your code
    const supabase = await createClient();
    // NOTE: Ignore the warning. It’s not blocking anything, and it’ll go away in future stable versions. It’s a known false-positive in Next.js 14+.

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
