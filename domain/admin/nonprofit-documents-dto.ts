import "server-only";

import { supabaseAdmin } from "@/utils/supabase/service-worker";

export { uploadEntityDocument as uploadNonprofitDocument } from "@/domain/entities/entity-documents-dto";

export async function ingestDocumentStub(params: {
  entityId: string;
  versionId: string;
}) {
  const { entityId, versionId } = params;

  const { data: version, error: versionError } = await supabaseAdmin
    .from("document_versions")
    .select("id, document_id, storage_bucket, storage_path, mime_type")
    .eq("id", versionId)
    .maybeSingle();

  if (versionError) {
    throw new Error(versionError.message);
  }

  if (!version?.id) {
    throw new Error("Document version not found");
  }

  const payload = {
    document_version_id: version.id,
    document_id: version.document_id,
    storage_bucket: version.storage_bucket,
    storage_path: version.storage_path,
    mime_type: version.mime_type,
  };

  const { error: ingestError } = await supabaseAdmin
    .from("entity_source_records")
    .upsert(
      {
        entity_id: entityId,
        source: "pdf_ingest_stub",
        payload,
      },
      { onConflict: "entity_id,source" },
    );

  if (ingestError) {
    throw new Error(ingestError.message);
  }

  await supabaseAdmin.from("entity_onboarding_progress").upsert(
    {
      entity_id: entityId,
      section: "documents",
      status: "complete",
      last_updated: new Date().toISOString(),
    },
    { onConflict: "entity_id,section" },
  );

  return payload;
}
