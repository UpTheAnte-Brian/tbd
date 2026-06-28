import type { NextRequest } from "next/server";
import { getEntityBookkeepingSnapshot } from "@/domain/business/bookkeeping-dto";
import {
  getServerClient,
  getUserOrThrow,
  jsonError,
  jsonOk,
  parseEntityId,
} from "@/app/lib/server/route-context";
import { isGlobalAdmin, requireEntityUser } from "@/app/lib/server/rbac";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await getServerClient();

  try {
    const entityId = await parseEntityId(supabase, context.params);
    const user = await getUserOrThrow(supabase);
    const globalAdmin = await isGlobalAdmin(supabase, user);

    if (!globalAdmin) {
      await requireEntityUser({ supabase, userId: user.id, entityId });
    }

    const snapshot = await getEntityBookkeepingSnapshot(entityId);
    return jsonOk(snapshot);
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to load bookkeeping";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 403
      : lower.includes("not found")
      ? 404
      : 500;
    return jsonError(message, status);
  }
}
