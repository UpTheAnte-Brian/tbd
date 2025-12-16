import {
    DELETE as entityUsersDelete,
    POST as entityUsersPOST,
} from "@/app/api/entity-users/route";
import { NextRequest } from "next/server";

type Payload = {
    entityId?: string;
    userId?: string;
    role?: "admin" | "editor" | "viewer" | "employee";
};

export async function POST(req: NextRequest) {
    const body = (await req.json()) as Payload;
    const forwardedRequest = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify({
            entityType: "business",
            entityId: body.entityId,
            userId: body.userId,
            role: body.role,
        }),
    });

    return entityUsersPOST(forwardedRequest);
}

export async function DELETE(req: NextRequest) {
    const body = (await req.json()) as Payload;

    const forwardedRequest = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify({
            entityType: "business",
            entityId: body.entityId,
            userId: body.userId,
        }),
    });

    return entityUsersDelete(forwardedRequest);
}
