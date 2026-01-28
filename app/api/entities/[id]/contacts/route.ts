import { NextResponse, type NextRequest } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { getEntityContactsDTO } from "@/domain/entities/entity-contacts-dto";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const supabase = await createApiClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
        return NextResponse.json({ error: "Missing entityId" }, { status: 400 });
    }

    const role = request.nextUrl.searchParams.get("role");

    try {
        const response = await getEntityContactsDTO(id, role);
        return NextResponse.json(response);
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Failed to load contacts";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
