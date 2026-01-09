// app/api/nonprofits/[id]/route.ts
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { getNonprofitDTO, updateNonprofitDTO } from "@/domain/nonprofits/nonprofit-dto";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    return safeRoute(async () => {
        const { id } = await context.params;
        const nonprofit = await getNonprofitDTO(id);
        return NextResponse.json<typeof nonprofit>(nonprofit);
    });
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    return safeRoute(async () => {
        const body = await req.json();
        const { id } = await context.params;
        const updated = await updateNonprofitDTO(id, body);
        return NextResponse.json<typeof updated>(updated);
    });
}

// export async function DELETE(req: NextRequest, { params }: RouteParams) {
//     return safeRoute(async () => {
//         console.log("DELETE /api/nonprofits/" + params.id, {
//             ip: req.ip ?? "unknown",
//             method: req.method,
//             timestamp: new Date().toISOString(),
//         });

//         const supabase = await createClient();
//         const { error } = await supabase
//             .from("nonprofits")
//             .delete()
//             .eq("id", params.id);

//         if (error) throw error;
//         return NextResponse.json<{ success: boolean }>({ success: true });
//     });
// }
