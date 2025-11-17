import { NextResponse } from "next/server";
import { approveBusiness } from "@/app/data/businesses-dto";

export async function POST(req: Request) {
    try {
        const { business_id } = await req.json();
        console.log("ubsiness ID: ", business_id);
        if (!business_id) {
            return NextResponse.json(
                { error: "Missing business_id" },
                { status: 400 },
            );
        }

        await approveBusiness(business_id);

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
