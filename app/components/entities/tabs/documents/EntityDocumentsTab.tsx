"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import type { Database } from "@/database.types";

type EntityDocumentItem = {
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

const DOCUMENT_TYPE_OPTIONS = [
  { value: "service_contract", label: "Service Contract" },
  { value: "form_990", label: "Form 990" },
  { value: "irs_determination_letter", label: "IRS Determination Letter" },
  { value: "other", label: "Other" },
] as const;

const DOCUMENT_TYPE_LABELS: Partial<
  Record<Database["public"]["Enums"]["document_type"], string>
> = {
  service_contract: "Service Contract",
  form_990: "Form 990",
  irs_determination_letter: "IRS Determination Letter",
  other: "Other",
};

type Props = {
  entityId: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function EntityDocumentsTab({ entityId }: Props) {
  const currentYear = new Date().getFullYear();
  const [documents, setDocuments] = useState<EntityDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("other");
  const [title, setTitle] = useState("");
  const [taxYear, setTaxYear] = useState<number | "">(() => currentYear - 1);
  const [fileInputKey, setFileInputKey] = useState(0);

  const taxYearOptions = useMemo(
    () => Array.from({ length: 10 }, (_, index) => currentYear - index),
    [currentYear],
  );

  const contractDocuments = useMemo(
    () => documents.filter((document) => document.document_type === "service_contract"),
    [documents],
  );

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/entities/${entityId}/documents`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to load documents");
      }
      const payload = (await response.json()) as {
        documents?: EntityDocumentItem[];
      };
      setDocuments(payload.documents ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load documents",
      );
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async () => {
    if (!uploadFile) return;
    if (documentType === "form_990" && !taxYear) {
      setError("Tax year is required for Form 990 uploads.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("document_type", documentType);
      if (title.trim()) {
        formData.append("title", title.trim());
      }
      if (documentType === "form_990" && taxYear) {
        formData.append("tax_year", String(taxYear));
      }

      const response = await fetch(`/api/entities/${entityId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Upload failed");
      }

      const payload = (await response.json()) as {
        documents?: EntityDocumentItem[];
      };
      setDocuments(payload.documents ?? []);
      setUploadFile(null);
      setTitle("");
      setTaxYear(currentYear - 1);
      setFileInputKey((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-text-on-light">
            Entity Documents
          </h2>
          <p className="text-sm text-brand-secondary-0">
            Upload and retain important entity documents. Files added during
            onboarding will also appear here.
          </p>
        </header>

        <div className="mt-4 space-y-3 rounded-lg border border-border-subtle bg-surface-inset px-4 py-4">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              key={fileInputKey}
              type="file"
              accept="application/pdf"
              onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-on-light"
            />
            <button
              type="button"
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="rounded-lg bg-brand-primary-0 px-4 py-2 text-sm font-semibold text-brand-primary-1 shadow-sm transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload PDF"}
            </button>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <label className="grid gap-1 text-xs uppercase tracking-wide text-brand-secondary-0">
              Document type
              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-on-light"
              >
                {DOCUMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-xs uppercase tracking-wide text-brand-secondary-0">
              Tax year (990 only)
              <select
                value={taxYear === "" ? "" : String(taxYear)}
                onChange={(event) => {
                  const value = event.target.value;
                  setTaxYear(value ? Number(value) : "");
                }}
                disabled={documentType !== "form_990"}
                className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-on-light disabled:cursor-not-allowed disabled:bg-surface-inset"
              >
                {taxYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-xs uppercase tracking-wide text-brand-secondary-0">
              Title (optional)
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-on-light"
                placeholder="Document title"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-text-on-light">
            Saved Documents
          </h2>
          <p className="text-sm text-brand-secondary-0">
            Internal document registry for this entity.
          </p>
        </header>

        <div className="mt-4 rounded-lg border border-border-subtle bg-surface-inset px-4 py-4">
          {documents.length === 0 ? (
            <div className="text-sm text-brand-secondary-0">
              No documents uploaded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {contractDocuments.length > 0 ? (
                <div className="rounded-lg border border-brand-primary-0/30 bg-brand-primary-1/40 px-4 py-4">
                  <div className="text-sm font-semibold text-text-on-light">
                    Service Contracts
                  </div>
                  <div className="mt-3 space-y-2">
                    {contractDocuments.map((document) => (
                      <div
                        key={`contract-${document.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-card px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-text-on-light">
                            {document.title}
                          </div>
                          <div className="text-xs text-brand-secondary-0">
                            Uploaded {formatDate(document.created_at)}
                          </div>
                        </div>
                        {document.signed_url ? (
                          <a
                            href={document.signed_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-border-subtle px-3 py-1 text-xs font-semibold text-text-on-light transition hover:border-brand-primary-0 hover:text-brand-primary-0"
                          >
                            Open Contract
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-text-on-light">
                      {document.title}
                    </div>
                    <div className="text-xs text-brand-secondary-0">
                      {DOCUMENT_TYPE_LABELS[document.document_type] ?? document.document_type}
                      {document.tax_year ? ` · Tax year ${document.tax_year}` : ""}
                      {` · Uploaded ${formatDate(document.created_at)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border-subtle bg-surface-inset px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-secondary-0">
                      {document.visibility}
                    </span>
                    {document.signed_url ? (
                      <a
                        href={document.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-border-subtle px-3 py-1 text-xs font-semibold text-text-on-light transition hover:border-brand-primary-0 hover:text-brand-primary-0"
                      >
                        Open
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
