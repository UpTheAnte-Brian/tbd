import type { NextRequest } from "next/server";
import {
  attachEntityBookkeepingContractDocument,
  getEntityBookkeepingSnapshot,
} from "@/domain/business/bookkeeping-dto";
import { uploadEntityDocument } from "@/domain/entities/entity-documents-dto";
import {
  getServerClient,
  getUserOrThrow,
  jsonError,
  jsonOk,
  parseEntityId,
} from "@/app/lib/server/route-context";
import {
  isGlobalAdmin,
  requireEntityAdmin,
} from "@/app/lib/server/rbac";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await getServerClient();

  try {
    const entityId = await parseEntityId(supabase, context.params);
    const user = await getUserOrThrow(supabase);
    const globalAdmin = await isGlobalAdmin(supabase, user);

    if (!globalAdmin) {
      await requireEntityAdmin({ supabase, userId: user.id, entityId });
    }

    const formData = await req.formData();
    const engagementId = formData.get("engagement_id");
    const file = formData.get("file");
    const titleValue = formData.get("title");

    if (typeof engagementId !== "string" || engagementId.trim().length === 0) {
      throw new Error("Engagement id is required");
    }

    if (!file || !(file instanceof File)) {
      throw new Error("Contract file is required");
    }

    const title =
      typeof titleValue === "string" && titleValue.trim().length > 0
        ? titleValue.trim()
        : null;

    const uploadResult = await uploadEntityDocument({
      entityId,
      file,
      documentType: "service_contract",
      title,
      taxYear: null,
    });

    await attachEntityBookkeepingContractDocument(
      entityId,
      engagementId.trim(),
      uploadResult.document_id,
    );

    const snapshot = await getEntityBookkeepingSnapshot(entityId);
    return jsonOk(snapshot);
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to upload contract";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 403
      : lower.includes("not found")
      ? 404
      : lower.includes("required") || lower.includes("invalid")
      ? 400
      : 500;
    return jsonError(message, status);
  }
}
