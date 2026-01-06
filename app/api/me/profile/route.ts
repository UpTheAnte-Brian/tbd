import { NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import type { Database } from "@/database.types";

type ProfileUpdatePayload = Pick<
    Database["public"]["Tables"]["profiles"]["Update"],
    "full_name" | "first_name" | "last_name" | "username" | "website" | "avatar_url"
>;

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export async function PATCH(request: Request) {
    const supabase = await createApiClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const update: ProfileUpdate = {
        updated_at: new Date().toISOString(),
    };
    const record = body as Record<string, unknown>;
    const fields: Array<keyof ProfileUpdatePayload> = [
        "full_name",
        "first_name",
        "last_name",
        "username",
        "website",
        "avatar_url",
    ];

    for (const field of fields) {
        const value = record[field];
        if (value === undefined) continue;
        if (value === null || typeof value === "string") {
            update[field] = value as ProfileUpdate[typeof field];
            continue;
        }
        return NextResponse.json(
            { error: `Invalid ${field}` },
            { status: 400 },
        );
    }

    const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...update });

    if (updateError) {
        console.error(updateError);
        return NextResponse.json(
            { error: "Failed to update profile" },
            { status: 500 },
        );
    }

    return NextResponse.json({ ok: true });
}
