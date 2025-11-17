import { NextResponse } from "next/server";
import { rejectBusiness } from "@/app/data/businesses-dto";

export async function POST(req: Request) {
    try {
        const { business_id } = await req.json();

        if (!business_id) {
            return NextResponse.json(
                { error: "Missing business_id" },
                { status: 400 },
            );
        }

        await rejectBusiness(business_id);

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        return NextResponse.json(
            {
                error: err instanceof Error
                    ? err.message
                    : "Internal server error",
            },
            { status: 500 },
        );
    }
}
