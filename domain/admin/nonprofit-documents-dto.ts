import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import { supabaseAdmin } from "@/utils/supabase/service-worker";

const DOCUMENT_BUCKET = "entity-documents";

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "document";
}

async function ensureDocumentsBucket(
  client: SupabaseClient<Database>,
): Promise<void> {
  const { data, error } = await client.storage.getBucket(DOCUMENT_BUCKET);
  if (!error && data) return;

  const { error: createError } = await client.storage.createBucket(
    DOCUMENT_BUCKET,
    {
      public: false,
    },
  );

  if (createError) {
    throw new Error(createError.message);
  }
}

export async function uploadNonprofitDocument(params: {
  entityId: string;
  file: File;
  documentType?: Database["public"]["Enums"]["document_type"];
  title?: string | null;
  taxYear?: number | null;
}) {
  const { entityId, file } = params;
  const documentType = params.documentType ?? "other";
  const title = params.title?.trim() || file.name || "Document";
  const taxYear = params.taxYear ?? null;

  await ensureDocumentsBucket(supabaseAdmin);

  const safeName = sanitizeFilename(file.name || "document.pdf");
  const timestamp = Date.now();
  const storagePath = `nonprofits/${entityId}/${documentType}/${timestamp}-${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: document, error: documentError } = await supabaseAdmin
    .from("documents")
    .insert({
      entity_id: entityId,
      title,
      document_type: documentType,
      status: "active",
      visibility: "internal",
      tax_year: taxYear,
    })
    .select("id")
    .single();

  if (documentError || !document) {
    throw new Error(documentError?.message ?? "Failed to create document");
  }

  const { data: version, error: versionError } = await supabaseAdmin
    .from("document_versions")
    .insert({
      document_id: document.id,
      storage_bucket: DOCUMENT_BUCKET,
      storage_path: storagePath,
      mime_type: file.type || "application/pdf",
      status: "draft",
      version_number: 1,
    })
    .select("id")
    .single();

  if (versionError || !version) {
    throw new Error(versionError?.message ?? "Failed to create document version");
  }

  const { error: updateError } = await supabaseAdmin
    .from("documents")
    .update({ current_version_id: version.id })
    .eq("id", document.id);

  if (updateError) {
    throw new Error(updateError.message);
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

  return {
    document_id: String(document.id),
    version_id: String(version.id),
    storage_path: storagePath,
  };
}

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
