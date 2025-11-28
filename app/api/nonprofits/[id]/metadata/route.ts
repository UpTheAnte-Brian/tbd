import { type NextRequest, NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { createApiClient } from "@/utils/supabase/route";

interface RouteParams {
    params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
    return safeRoute(async () => {
        const body = await req.json();
        const supabase = await createApiClient();

        const { error } = await supabase
            .from("foundation_metadata")
            .update({
                director: body.director ?? null,
                endowment_amount: body.endowment_amount === ""
                    ? null
                    : body.endowment_amount,
                grantmaking_focus: body.grantmaking_focus ?? null,
                additional_info: body.additional_info ?? null,
            })
            .eq("id", params.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    });
}
