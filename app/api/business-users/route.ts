import {
    DELETE as entityUsersDelete,
    POST as entityUsersPOST,
} from "@/app/api/entity-users/route";

export async function POST(req: Request) {
    // Force entityType to "business"
    const body = await req.json();
    const forwardedRequest = new Request(req.url, {
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

export async function DELETE(req: Request) {
    // Force entityType to "business"
    const body = await req.json();
    console.log("body: ", body);
    const forwardedRequest = new Request(req.url, {
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
