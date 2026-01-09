import { NextResponse } from "next/server";
import { getBusinesses, registerBusiness } from "@/domain/businesses/businesses-dto";

export async function GET() {
    try {
        const receipts = await getBusinesses();
        return NextResponse.json(receipts);
    } catch (err) {
        console.error("Error fetching receipts:", err);
        return NextResponse.json(
            { error: "Unable to fetch receipts" },
            { status: 500 },
        );
    }
}
export async function POST(request: Request) {
    try {
        const { userId, business } = await request.json();
        const newBusiness = await registerBusiness(userId, business);
        return NextResponse.json(newBusiness);
    } catch (err) {
        console.error("Error registering business:", err);
        return NextResponse.json(
            { error: "Unable to register business" },
            { status: 500 },
        );
    }
}
