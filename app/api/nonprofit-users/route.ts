import { type NextRequest, NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import {
    createNonprofitUserDTO,
    listNonprofitUsersDTO,
} from "@/app/data/nonprofit-users-dto";

// GET /api/nonprofit-users
// Returns all nonprofit-user assignments (public read allowed by RLS)
export async function GET() {
    return safeRoute(async () => {
        const data = await listNonprofitUsersDTO();
        return NextResponse.json(data);
    });
}

// POST /api/nonprofit-users
// Body:
// { nonprofit_id, user_id, role?, board_role? }
export async function POST(req: NextRequest) {
    return safeRoute(async () => {
        const body = await req.json();
        const created = await createNonprofitUserDTO(body);
        return NextResponse.json(created, { status: 201 });
    });
}
