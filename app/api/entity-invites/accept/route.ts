import type { NextRequest } from "next/server";
import {
  getServerClient,
  getUserOrThrow,
  jsonError,
  jsonOk,
} from "@/app/lib/server/route-context";
import { acceptEntityUserInvite } from "@/domain/entities/entity-people-dto";

export async function POST(req: NextRequest) {
  const supabase = await getServerClient();

  let body: { token?: string };
  try {
    body = (await req.json()) as { token?: string };
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return jsonError("token is required", 400);
  }

  try {
    const user = await getUserOrThrow(supabase);
    const result = await acceptEntityUserInvite({
      token,
      userId: user.id,
      userEmail: user.email ?? null,
    });
    return jsonOk(result);
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to accept invite";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 401
      : lower.includes("invalid") || lower.includes("expired")
      ? 400
      : lower.includes("email does not match")
      ? 403
      : 500;
    return jsonError(message, status);
  }
}
