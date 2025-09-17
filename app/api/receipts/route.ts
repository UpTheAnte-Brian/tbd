import { NextResponse } from "next/server";
import { getReceipts } from "@/app/data/receipt-dto";

export async function GET() {
    try {
        const receipts = await getReceipts();
        return NextResponse.json(receipts);
    } catch (err) {
        console.error("Error fetching receipts:", err);
        return NextResponse.json(
            { error: "Unable to fetch receipts" },
            { status: 500 },
        );
    }
}
