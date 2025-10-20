import { NextResponse } from "next/server";
import {
    getFoundationDTO,
    upsertFoundationDTO,
} from "@/app/data/foundation-dto";

export async function GET(
    _req: Request,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;

    const { data, error } = await getFoundationDTO(id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
}

export async function POST(
    _req: Request,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    const body = await _req.json();

    const { error } = await upsertFoundationDTO(id, body);

    if (error) {
        return NextResponse.json({ error: error.message }, {
            status: 500,
        });
    }

    return NextResponse.json({}, { status: 201 });
}
