import { NextResponse } from "next/server";
import { getFoundationsDTO } from "@/app/data/foundation-dto";

export async function GET() {
    const { data, error } = await getFoundationsDTO();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
}
