import { NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import {
    DELETE as entityUsersDELETE,
    POST as entityUsersPOST,
} from "@/app/api/entity-users/route";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const districtId = searchParams.get("districtId");
    if (!districtId) {
        return NextResponse.json({ error: "Missing districtId" }, {
            status: 400,
        });
    }
    const supabase = await createApiClient();

    const { data, error } = await supabase
        .from("district_users")
        .select("*, profiles(*)")
        .eq("district_id", districtId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function POST(req: Request) {
    // Force entityType to "district"
    const body = await req.json();
    const forwardedRequest = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify({
            entityType: "district",
            entityId: body.entityId,
            userId: body.userId,
            role: body.role,
        }),
    });

    return entityUsersPOST(forwardedRequest);
}

export async function DELETE(req: Request) {
    // Force entityType to "district"
    const body = await req.json();
    const forwardedRequest = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify({
            entityType: "district",
            entityId: body.entityId,
            userId: body.userId,
        }),
    });

    return entityUsersDELETE(forwardedRequest);
}
