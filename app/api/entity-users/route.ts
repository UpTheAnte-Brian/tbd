// app/api/entity-users/route.ts
import { NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

export async function POST(req: Request) {
    const supabase = await createApiClient();

    try {
        const { entityType, entityId, userId, role } = await req.json();
        if (!entityType || !entityId || !userId || !role) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 },
            );
        }

        let tableName = null;

        // Map entityType → table
        switch (entityType) {
            case "district":
                tableName = "district_users";
                break;
            case "business":
                tableName = "business_users";
                break;
            case "foundation":
                tableName = "foundation_users";
                break;
            case "campaign":
                tableName = "campaign_users";
                break;
            default:
                return NextResponse.json(
                    { error: `Unsupported entityType: ${entityType}` },
                    { status: 400 },
                );
        }

        // Insert or update
        const { data, error } = await supabase
            .from(tableName)
            .upsert(
                {
                    [`${entityType}_id`]: entityId,
                    user_id: userId,
                    role,
                },
                {
                    onConflict: `${entityType}_id,user_id`, // <-- important!
                },
            )
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (e: unknown) {
        let errorMessage = "Internal server error";
        if (e instanceof Error) {
            errorMessage = e.message;
        }
        console.error("Error in /api/entity-users:", e);
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 },
        );
    }
}

export async function DELETE(req: Request) {
    const supabase = await createApiClient();

    try {
        // Read the body once
        const { entityType, entityId, userId } = await req.json();

        // Destructure and validate in one line
        console.log("delete props: ", entityType, entityId, userId);
        if (!entityType || !entityId || !userId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 },
            );
        }

        // Map entityType → table
        const tableMap: Record<string, string> = {
            district: "district_users",
            business: "business_users",
            foundation: "foundation_users",
            campaign: "campaign_users",
        };
        const tableName = tableMap[entityType];
        if (!tableName) {
            return NextResponse.json(
                { error: `Unsupported entityType: ${entityType}` },
                { status: 400 },
            );
        }

        // Delete the record
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq(`${entityType}_id`, entityId)
            .eq("user_id", userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        let errorMessage = "Internal server error";
        if (e instanceof Error) {
            errorMessage = e.message;
        }
        console.error("Error in DELETE /api/entity-users:", e);
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 },
        );
    }
}
