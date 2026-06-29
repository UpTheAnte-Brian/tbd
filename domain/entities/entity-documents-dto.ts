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

type DocumentVersionLookup = {
  storage_bucket?: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
};

export type EntityDocumentItem = {
  id: string;
  title: string;
  document_type: Database["public"]["Enums"]["document_type"];
  status: Database["public"]["Enums"]["document_status"];
  visibility: Database["public"]["Enums"]["document_visibility"];
  tax_year: number | null;
  created_at: string;
  updated_at: string;
  current_version_id: string | null;
  signed_url: string | null;
  mime_type: string | null;
};

function takeFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listEntityDocuments(
  entityId: string,
): Promise<EntityDocumentItem[]> {
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select(
      `
        id,
        title,
        document_type,
        status,
        visibility,
        tax_year,
        created_at,
        updated_at,
        current_version_id,
        current_version:document_versions!documents_current_version_fk(
          storage_bucket,
          storage_path,
          mime_type
        )
      `,
    )
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return Promise.all(
    (data ?? []).map(async (row) => {
      const currentVersion = takeFirst(
        row.current_version as DocumentVersionLookup | DocumentVersionLookup[] | null,
      );

      let signedUrl: string | null = null;
      if (currentVersion?.storage_bucket && currentVersion?.storage_path) {
        const { data: signedData, error: signedError } = await supabaseAdmin
          .storage
          .from(currentVersion.storage_bucket)
          .createSignedUrl(currentVersion.storage_path, 60 * 60);

        if (signedError) {
          console.warn("Failed to create signed URL for document", {
            documentId: row.id,
            message: signedError.message,
          });
        } else {
          signedUrl = signedData?.signedUrl ?? null;
        }
      }

      return {
        id: String(row.id),
        title: String(row.title ?? "Document"),
        document_type: row.document_type,
        status: row.status,
        visibility: row.visibility,
        tax_year: row.tax_year ?? null,
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
        current_version_id: row.current_version_id ?? null,
        signed_url: signedUrl,
        mime_type: currentVersion?.mime_type ?? null,
      };
    }),
  );
}

export async function uploadEntityDocument(params: {
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
  const storagePath = `entities/${entityId}/${documentType}/${timestamp}-${safeName}`;

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

  return {
    document_id: String(document.id),
    version_id: String(version.id),
    storage_path: storagePath,
  };
}
