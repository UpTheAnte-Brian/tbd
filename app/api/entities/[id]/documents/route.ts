import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { resolveEntityId } from "@/app/lib/entities";
import { isGlobalAdmin, requireEntityUser } from "@/app/lib/server/rbac";
import {
  listEntityDocuments,
  uploadEntityDocument,
} from "@/domain/entities/entity-documents-dto";
import type { Database } from "@/database.types";
import { createApiClient } from "@/utils/supabase/route";

async function resolveAuthorizedEntity(entityKey: string) {
  const supabase = await createApiClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: jsonError("Unauthorized", 401) };
  }

  let entityId = entityKey;
  try {
    entityId = await resolveEntityId(supabase, entityKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Entity not found";
    return { error: jsonError(message, 404) };
  }

  const globalAdmin = await isGlobalAdmin(supabase, user);
  if (!globalAdmin) {
    try {
      await requireEntityUser({
        supabase,
        userId: user.id,
        entityId,
      });
    } catch {
      return { error: jsonError("Unauthorized", 403) };
    }
  }

  return { entityId };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return safeRoute(async () => {
    const { id: entityKey } = await context.params;
    if (!entityKey) {
      return jsonError("entity_id is required", 400);
    }

    const resolved = await resolveAuthorizedEntity(entityKey);
    if ("error" in resolved) {
      return resolved.error;
    }

    const documents = await listEntityDocuments(resolved.entityId);
    return NextResponse.json({ documents });
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return safeRoute(async () => {
    const { id: entityKey } = await context.params;
    if (!entityKey) {
      return jsonError("entity_id is required", 400);
    }

    const resolved = await resolveAuthorizedEntity(entityKey);
    if ("error" in resolved) {
      return resolved.error;
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const documentType = formData.get("document_type") as
      | Database["public"]["Enums"]["document_type"]
      | null;
    const title = (formData.get("title") as string | null) ?? null;
    const taxYearRaw = formData.get("tax_year");
    const taxYear = taxYearRaw ? Number(taxYearRaw) : null;
    const taxYearValue = Number.isFinite(taxYear) ? taxYear : null;

    if (!file || !(file instanceof File)) {
      return jsonError("file is required", 400);
    }

    if (documentType === "form_990" && !taxYearValue) {
      return jsonError("tax_year is required for Form 990 uploads", 400);
    }

    await uploadEntityDocument({
      entityId: resolved.entityId,
      file,
      documentType: documentType ?? "other",
      title,
      taxYear: taxYearValue,
    });

    const documents = await listEntityDocuments(resolved.entityId);
    return NextResponse.json({ documents }, { status: 201 });
  });
}
