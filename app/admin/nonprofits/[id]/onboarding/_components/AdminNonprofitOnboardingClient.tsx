"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ONBOARDING_SECTION_LABELS,
  ONBOARDING_SECTIONS,
  type OnboardingSection,
} from "@/app/lib/nonprofit-onboarding";
import type {
  NonprofitOnboardingData,
  UpdateOnboardingIdentityRequest,
} from "@/app/lib/types/nonprofit-onboarding";

const OVERRIDE_NAMESPACE = "nonprofit.profile";
const DOCUMENT_TYPE_OPTIONS = [
  { value: "form_990", label: "Form 990" },
  { value: "irs_determination_letter", label: "IRS Determination Letter" },
  { value: "other", label: "Other" },
] as const;

export default function AdminNonprofitOnboardingClient({
  entityId,
  scopeId,
  initialEin,
}: {
  entityId: string;
  scopeId?: string | null;
  initialEin?: string | null;
}) {
  const currentYear = new Date().getFullYear();
  const [data, setData] = useState<NonprofitOnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeSection, setActiveSection] =
    useState<OnboardingSection>("identity");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [documentType, setDocumentType] = useState<string>("other");
  const [taxYear, setTaxYear] = useState<number | "">(() => currentYear - 1);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [resolvedScopeId, setResolvedScopeId] = useState<string | null>(
    scopeId ?? null,
  );

  const [identityForm, setIdentityForm] =
    useState<UpdateOnboardingIdentityRequest>({});
  const [identityBaseline, setIdentityBaseline] =
    useState<UpdateOnboardingIdentityRequest>({});

  const [personClaimEmails, setPersonClaimEmails] = useState<
    Record<string, string>
  >({});

  const normalizeIdentityValue = (value: string | null | undefined) =>
    (value ?? "").trim();

  const taxYearOptions = useMemo(
    () => Array.from({ length: 10 }, (_, index) => currentYear - index),
    [currentYear],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const query = scopeId ? `?scope_id=${encodeURIComponent(scopeId)}` : "";
      const response = await fetch(
        `/api/admin/nonprofits/${entityId}/onboarding${query}`,
        {
          cache: "no-store",
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to load onboarding data");
      }
      const payload = (await response.json()) as NonprofitOnboardingData;
      setData(payload);
      if (!resolvedScopeId && payload.scope?.id) {
        setResolvedScopeId(String(payload.scope.id));
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load onboarding data",
      );
    } finally {
      setLoading(false);
    }
  }, [entityId, scopeId, resolvedScopeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!data) return;
    const scopedEin = initialEin ?? data.scope?.ein ?? "";
    const effectiveEin = data.hasIrsLink
      ? (data.linkedEin ?? data.nonprofit?.ein ?? "")
      : (data.nonprofit?.ein ?? scopedEin);
    const baseline = {
      name: data.entity?.name ?? "",
      ein: effectiveEin,
      website_url: data.nonprofit?.website_url ?? "",
      mission_statement: data.nonprofit?.mission_statement ?? "",
    };
    setIdentityForm(baseline);
    setIdentityBaseline(baseline);
  }, [data, initialEin]);

  const progressBySection = useMemo(() => {
    const map = new Map<string, string>();
    (data?.onboarding_progress ?? []).forEach((row) => {
      map.set(row.section, row.status);
    });
    return map;
  }, [data]);

  const isEinLocked = Boolean(data?.hasIrsLink);

  const isIdentityDirty = useMemo(() => {
    const einDirty = !isEinLocked
      ? normalizeIdentityValue(identityForm.ein) !==
        normalizeIdentityValue(identityBaseline.ein)
      : false;
    return (
      normalizeIdentityValue(identityForm.name) !==
        normalizeIdentityValue(identityBaseline.name) ||
      einDirty ||
      normalizeIdentityValue(identityForm.website_url) !==
        normalizeIdentityValue(identityBaseline.website_url) ||
      normalizeIdentityValue(identityForm.mission_statement) !==
        normalizeIdentityValue(identityBaseline.mission_statement)
    );
  }, [identityForm, identityBaseline, isEinLocked]);

  const claimsByPersonId = useMemo(() => {
    const map = new Map<string, string>();
    (data?.person_claims ?? []).forEach((claim) => {
      map.set(claim.source_person_id, claim.email);
    });
    return map;
  }, [data]);

  const getStatus = (section: OnboardingSection) =>
    (progressBySection.get(section) ?? "pending") as
      | "pending"
      | "in_progress"
      | "complete"
      | "skipped";

  // const statusStyles = (status: string) => {
  //   if (status === "complete") return "bg-brand-accent-1";
  //   if (status === "in_progress") return "bg-amber-200";
  //   if (status === "skipped") return "bg-brand-secondary-0";
  //   return "bg-brand-secondary-2";
  // };

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "--";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const runAction = async (
    label: string,
    url: string,
    options?: RequestInit,
  ) => {
    setActionLoading(label);
    setActionError(null);

    const effectiveScopeId = resolvedScopeId ?? scopeId;
    const withScopeId = effectiveScopeId
      ? `${url}?scope_id=${encodeURIComponent(effectiveScopeId)}`
      : url;

    try {
      const response = await fetch(withScopeId, {
        method: options?.method ?? "POST",
        headers: { "Content-Type": "application/json" },
        ...options,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Request failed");
      }

      const payload = (await response.json()) as NonprofitOnboardingData;
      setData(payload);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleIdentitySave = async () => {
    const payload: UpdateOnboardingIdentityRequest = { ...identityForm };
    if (isEinLocked) {
      delete payload.ein;
    }
    await runAction(
      "identity",
      `/api/admin/nonprofits/${entityId}/onboarding/identity`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  };

  const handleProgressUpdate = async (
    section: OnboardingSection,
    status: "pending" | "in_progress" | "complete" | "skipped",
  ) => {
    await runAction(
      `progress-${section}`,
      `/api/admin/nonprofits/${entityId}/onboarding/progress`,
      {
        method: "PATCH",
        body: JSON.stringify({ section, status }),
      },
    );
  };

  const handleIrsLink = async () => {
    await runAction(
      "irs-link",
      `/api/admin/nonprofits/${entityId}/onboarding/irs-link`,
    );
  };

  const handleOverrideToggle = async (
    fieldKey: string,
    value: unknown,
    enabled: boolean,
  ) => {
    const url = `/api/admin/nonprofits/${entityId}/onboarding/overrides`;
    if (enabled) {
      await runAction("override", url, {
        method: "POST",
        body: JSON.stringify({
          namespace: OVERRIDE_NAMESPACE,
          field_key: fieldKey,
          value,
          source: "manual",
          confidence: 100,
        }),
      });
    } else {
      await runAction("override", url, {
        method: "DELETE",
        body: JSON.stringify({
          namespace: OVERRIDE_NAMESPACE,
          field_key: fieldKey,
        }),
      });
    }
  };

  const handlePersonClaim = async (personId: string) => {
    const email = personClaimEmails[personId]?.trim() ?? "";
    if (!email) {
      setActionError("Email is required to link a board member.");
      return;
    }

    setActionLoading(`claim-${personId}`);
    setActionError(null);

    const effectiveScopeId = resolvedScopeId ?? scopeId;
    const query = effectiveScopeId
      ? `?scope_id=${encodeURIComponent(effectiveScopeId)}`
      : "";

    try {
      const response = await fetch(
        `/api/admin/nonprofits/${entityId}/onboarding/person-claims${query}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_person_id: personId,
            email,
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to save claim");
      }

      const payload = (await response.json()) as NonprofitOnboardingData;
      setData(payload);
      setPersonClaimEmails((prev) => ({
        ...prev,
        [personId]: "",
      }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async () => {
    await runAction(
      "activate",
      `/api/admin/nonprofits/${entityId}/onboarding/activate`,
    );
  };

  const handleDocumentUpload = async () => {
    if (!uploadFile) return;
    if (documentType === "form_990" && !taxYear) {
      setActionError("Tax year is required for Form 990 uploads.");
      return;
    }
    setActionLoading("upload");
    setActionError(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("document_type", documentType);
      if (uploadTitle.trim()) {
        formData.append("title", uploadTitle.trim());
      }
      if (documentType === "form_990" && taxYear) {
        formData.append("tax_year", String(taxYear));
      }

      const effectiveScopeId = resolvedScopeId ?? scopeId;
      const query = effectiveScopeId
        ? `?scope_id=${encodeURIComponent(effectiveScopeId)}`
        : "";
      const response = await fetch(
        `/api/admin/nonprofits/${entityId}/documents${query}`,
        { method: "POST", body: formData },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Upload failed");
      }

      const payload = (await response.json()) as NonprofitOnboardingData;
      setData(payload);
      setUploadFile(null);
      setUploadTitle("");
      setTaxYear(currentYear - 1);
      setFileInputKey((prev) => prev + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleIngestStub = async (versionId: string | null) => {
    if (!versionId) return;
    await runAction(
      `ingest-${versionId}`,
      `/api/admin/nonprofits/${entityId}/documents/${versionId}/ingest`,
    );
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-card p-6 text-sm text-brand-secondary-0 shadow-sm">
        Loading onboarding...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
        {loadError}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-card p-6 text-sm text-brand-secondary-0 shadow-sm">
        No data found.
      </div>
    );
  }

  const irsLegalName = data.irs_organization?.legal_name ?? "--";
  const irsWebsite = data.irs_organization?.website ?? "--";
  const irsCanonicalEin = data.irs_link?.ein ?? data.linkedEin ?? "--";
  const irsLinkStatus = data.irs_link ? "Linked" : "Not linked";
  const irsLinkTimestamp = formatDateTime(data.irs_link?.created_at ?? null);
  const irsOrgName = data.irs_organization?.legal_name ?? "--";
  const entityName = data.entity.name ?? "--";
  const nonprofitWebsite = data.nonprofit?.website_url ?? "--";
  const canOverrideName = Boolean(data.irs_organization?.legal_name);
  const canOverrideWebsite = Boolean(data.irs_organization?.website);
  const latestReturn = data.irs_latest_return;
  const latestFinancials = data.irs_financials;
  const latestTaxYear =
    latestReturn?.tax_year ?? latestFinancials?.tax_year ?? null;
  const isStaleTaxYear =
    latestTaxYear !== null ? latestTaxYear < currentYear - 1 : false;
  const hasReturns = Boolean(latestReturn?.id || latestFinancials?.return_id);
  const hasPeople = (data.irs_people ?? []).length > 0;
  const needsAttention = [
    !hasReturns ? "No IRS returns found yet." : null,
    !hasPeople ? "No officer/director list available." : null,
    isStaleTaxYear && latestTaxYear
      ? `Latest return year is ${latestTaxYear}.`
      : null,
  ].filter(Boolean) as string[];
  const isTaxYearValid = documentType !== "form_990" ? true : Boolean(taxYear);

  const overrides = data.overrides ?? [];
  const hasNameOverride = overrides.some(
    (row) =>
      row.namespace === OVERRIDE_NAMESPACE && row.field_key === "legal_name",
  );
  const hasWebsiteOverride = overrides.some(
    (row) =>
      row.namespace === OVERRIDE_NAMESPACE && row.field_key === "website_url",
  );
  const scope = data.scope ?? null;
  const scopeLabel = scope?.label ?? scope?.ein ?? null;
  const scopeStatus = scope?.status ?? null;
  const canViewDashboard =
    Boolean(scope?.is_ready) && Boolean(scope?.district_entity_id);

  return (
    <div className="space-y-6">
      {actionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700 shadow-sm">
          {actionError}
        </div>
      ) : null}
      <header className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-card px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-brand-secondary-0">
            Nonprofit Onboarding
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-text-on-light">
            {data.entity.name}
          </h1>
          <p className="mt-1 text-sm text-brand-secondary-0">
            Entity ID: {data.entity.id}
          </p>
          {scopeLabel ? (
            <p className="mt-1 text-sm text-brand-secondary-0">
              Scope: {scopeLabel}
              {scopeStatus ? ` · ${scopeStatus}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              data.entity.active
                ? "bg-brand-primary-0 text-brand-primary-1"
                : "bg-brand-secondary-2 text-brand-secondary-1"
            }`}
          >
            {data.entity.active ? "Active" : "Inactive"}
          </span>
          <Link
            href="/admin/nonprofits"
            className="rounded-md border border-border-subtle px-3 py-1 text-xs font-semibold text-text-on-light transition hover:border-brand-primary-0 hover:text-brand-primary-0"
          >
            Back to onboarding queue
          </Link>
          {canViewDashboard ? (
            <Link
              href={`/districts/${scope?.district_entity_id}?tab=superintendent`}
              className="rounded-md border border-border-subtle px-3 py-1 text-xs font-semibold text-text-on-light transition hover:border-brand-primary-0 hover:text-brand-primary-0"
            >
              View superintendent dashboard
            </Link>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-secondary-0">
            Checklist
          </div>
          <ul className="mt-4 space-y-2">
            {ONBOARDING_SECTIONS.map((section) => {
              const status = getStatus(section);
              const effectiveStatus =
                section === "irs_link" && Boolean(data.irs_link)
                  ? "complete"
                  : status;
              const indicatorClassName =
                effectiveStatus === "complete"
                  ? "border-brand-primary-0 bg-brand-primary-0 text-brand-primary-1"
                  : effectiveStatus === "in_progress"
                    ? "border-amber-300 bg-amber-100 text-amber-700"
                    : effectiveStatus === "skipped"
                      ? "border-brand-secondary-0 text-brand-secondary-0"
                      : "border-border-subtle text-transparent";
              return (
                <li key={section}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(section)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                      activeSection === section
                        ? "bg-brand-primary-0 text-brand-primary-1"
                        : "text-text-on-light hover:bg-surface-inset"
                    }`}
                  >
                    <span>{ONBOARDING_SECTION_LABELS[section]}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold ${
                        indicatorClassName
                      }`}
                      title={`Status: ${effectiveStatus.replace("_", " ")}`}
                      aria-hidden="true"
                    >
                      {effectiveStatus === "complete" ? "✓" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="rounded-xl border border-border-subtle bg-surface-card p-6 shadow-sm">
          {activeSection === "identity" ? (
            <div className="space-y-4">
              <header>
                <h2 className="text-lg font-semibold text-text-on-light">
                  Identity
                </h2>
                <p className="text-sm text-brand-secondary-0">
                  Edit the nonprofit profile basics.
                </p>
              </header>

              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-text-on-light">
                  Organization name
                  <input
                    value={identityForm.name ?? ""}
                    onChange={(event) =>
                      setIdentityForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary-0 focus:outline-none"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-text-on-light">
                  EIN
                  <input
                    value={identityForm.ein ?? ""}
                    onChange={(event) =>
                      setIdentityForm((prev) => ({
                        ...prev,
                        ein: event.target.value,
                      }))
                    }
                    disabled={isEinLocked}
                    className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary-0 focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-inset"
                  />
                  {isEinLocked ? (
                    <span className="text-xs text-brand-secondary-0">
                      EIN is locked after IRS link. To change, unlink IRS first
                      (not implemented yet).
                    </span>
                  ) : null}
                  {isEinLocked && data.linkedEin ? (
                    <span className="text-xs text-brand-secondary-0">
                      Linked EIN: {data.linkedEin}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-text-on-light">
                  Website URL
                  <input
                    value={identityForm.website_url ?? ""}
                    onChange={(event) =>
                      setIdentityForm((prev) => ({
                        ...prev,
                        website_url: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary-0 focus:outline-none"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-text-on-light">
                  Mission statement
                  <textarea
                    value={identityForm.mission_statement ?? ""}
                    onChange={(event) =>
                      setIdentityForm((prev) => ({
                        ...prev,
                        mission_statement: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary-0 focus:outline-none"
                    rows={4}
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleIdentitySave}
                  disabled={actionLoading === "identity" || !isIdentityDirty}
                  className="rounded-lg bg-brand-primary-0 px-4 py-2 text-sm font-semibold text-brand-primary-1 shadow-sm transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "identity" ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("irs_link")}
                  className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-semibold text-text-on-light transition hover:border-brand-primary-0 hover:text-brand-primary-0"
                >
                  Next: IRS Link
                </button>
              </div>
            </div>
          ) : null}

          {activeSection === "irs_link" ? (
            <div className="space-y-4">
              <header>
                <h2 className="text-lg font-semibold text-text-on-light">
                  IRS Link
                </h2>
                <p className="text-sm text-brand-secondary-0">
                  This links the nonprofit entity to our internal IRS dataset
                  (organizations/returns already imported). No external IRS
                  calls happen here.
                </p>
              </header>

              <div className="rounded-lg border border-border-subtle bg-surface-inset px-4 py-3 text-sm text-text-on-light">
                {!data.nonprofit?.ein && !data.irs_link ? (
                  <span className="text-brand-secondary-0">
                    Add an EIN in Identity to enable IRS linking.
                  </span>
                ) : (
                  <div className="grid gap-1">
                    <span>Canonical EIN: {irsCanonicalEin}</span>
                    <span>IRS legal name: {irsOrgName}</span>
                    <span>
                      Link status: {irsLinkStatus}
                      {data.irs_link ? ` · ${irsLinkTimestamp}` : ""}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleIrsLink}
                  disabled={
                    actionLoading === "irs-link" ||
                    !data.nonprofit?.ein ||
                    Boolean(data.irs_link)
                  }
                  className="rounded-lg bg-brand-primary-0 px-4 py-2 text-sm font-semibold text-brand-primary-1 shadow-sm transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "irs-link" ? "Linking..." : "Link EIN"}
                </button>
                {data.irs_link?.ein ? (
                  <a
                    href="https://apps.irs.gov/app/eos/"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-semibold text-text-on-light transition hover:border-brand-primary-0 hover:text-brand-primary-0"
                  >
                    Open IRS Pub 78
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setActiveSection("documents")}
                  className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-semibold text-text-on-light transition hover:border-brand-primary-0 hover:text-brand-primary-0"
                >
                  Next: Documents
                </button>
              </div>
            </div>
          ) : null}

          {activeSection === "documents" ? (
            <div className="space-y-4">
              <header>
                <h2 className="text-lg font-semibold text-text-on-light">
                  Documents
                </h2>
                <p className="text-sm text-brand-secondary-0">
                  Upload onboarding documents. Form 990 uploads need a tax year.
                </p>
              </header>

              <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-inset px-4 py-4 text-sm text-text-on-light">
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <input
                    key={fileInputKey}
                    type="file"
                    accept="application/pdf"
                    onChange={(event) =>
                      setUploadFile(event.target.files?.[0] ?? null)
                    }
                    className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-on-light"
                  />
                  <button
                    type="button"
                    onClick={handleDocumentUpload}
                    disabled={
                      !uploadFile ||
                      !isTaxYearValid ||
                      actionLoading === "upload"
                    }
                    className="rounded-lg bg-brand-primary-0 px-4 py-2 text-sm font-semibold text-brand-primary-1 shadow-sm transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "upload" ? "Uploading..." : "Upload PDF"}
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
                      value={uploadTitle}
                      onChange={(event) => setUploadTitle(event.target.value)}
                      className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-on-light"
                      placeholder="Document title"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-border-subtle bg-surface-inset px-4 py-6 text-sm text-brand-secondary-0">
                {data.documents.length > 0 ? (
                  <div className="space-y-3">
                    {data.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-card px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-medium text-text-on-light">
                            {doc.title}
                          </div>
                          <div className="text-xs text-brand-secondary-0">
                            {doc.document_type}
                            {doc.tax_year ? ` · Tax year ${doc.tax_year}` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleIngestStub(doc.current_version_id)
                          }
                          disabled={
                            !doc.current_version_id ||
                            actionLoading === `ingest-${doc.current_version_id}`
                          }
                          className="rounded-md border border-border-subtle px-3 py-1 text-xs font-semibold text-text-on-light transition hover:border-brand-primary-0 hover:text-brand-primary-0 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading === `ingest-${doc.current_version_id}`
                            ? "Ingesting..."
                            : "Ingest (stub)"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  "No documents uploaded yet."
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleProgressUpdate("documents", "complete")}
                  disabled={actionLoading === "progress-documents"}
                  className="rounded-lg bg-brand-primary-0 px-4 py-2 text-sm font-semibold text-brand-primary-1 shadow-sm transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Mark Complete
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleProgressUpdate("documents", "in_progress")
                  }
                  disabled={actionLoading === "progress-documents"}
                  className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-semibold text-text-on-light transition hover:border-brand-primary-0 hover:text-brand-primary-0"
                >
                  Save progress
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("review")}
                  className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-semibold text-text-on-light transition hover:border-brand-primary-0 hover:text-brand-primary-0"
                >
                  Next: Review
                </button>
              </div>
            </div>
          ) : null}

          {activeSection === "review" ? (
            <div className="space-y-4">
              <header>
                <h2 className="text-lg font-semibold text-text-on-light">
                  Review & Overrides
                </h2>
                <p className="text-sm text-brand-secondary-0">
                  Spot-check key IRS fields and apply corrections where needed.
                  PDF parsing helps, but it will not perfectly extract every
                  schedule, narrative, or older scan.
                </p>
              </header>

              <div className="rounded-lg border border-border-subtle bg-surface-inset px-4 py-3 text-sm text-text-on-light">
                <div className="text-xs font-semibold uppercase tracking-wide text-brand-secondary-0">
                  Extraction expectations
                </div>
                <ul className="mt-2 space-y-1 text-sm text-brand-secondary-0">
                  <li>Reliable: EIN, legal name, address, tax year.</li>
                  <li>
                    Reliable: headline financials (revenue/expenses/assets).
                  </li>
                  <li>Often: officers/directors list (can be messy).</li>
                  <li>
                    Not guaranteed: all schedules, narratives, older scans.
                  </li>
                </ul>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border-subtle px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-brand-secondary-0">
                    Latest IRS Return
                  </div>
                  <div className="mt-2 text-sm font-medium text-text-on-light">
                    Tax year: {latestTaxYear ?? "--"}
                  </div>
                  <div className="text-sm text-brand-secondary-0">
                    Return type: {latestReturn?.return_type ?? "--"}
                  </div>
                  <div className="text-xs text-brand-secondary-0">
                    Filed on: {formatDateTime(latestReturn?.filed_on ?? null)}
                  </div>
                </div>
                <div className="rounded-lg border border-border-subtle px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-brand-secondary-0">
                    Financial Highlights
                  </div>
                  <div className="mt-2 text-sm text-text-on-light">
                    Revenue: {formatCurrency(latestFinancials?.total_revenue)}
                  </div>
                  <div className="text-sm text-text-on-light">
                    Expenses: {formatCurrency(latestFinancials?.total_expenses)}
                  </div>
                  <div className="text-sm text-text-on-light">
                    Assets: {formatCurrency(latestFinancials?.total_assets_end)}
                  </div>
                </div>
              </div>

              {needsAttention.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <div className="text-xs font-semibold uppercase tracking-wide">
                    Needs attention
                  </div>
                  <ul className="mt-2 space-y-1">
                    {needsAttention.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="rounded-lg border border-border-subtle px-4 py-3">
                <div className="flex flex-col gap-2">
                  <div className="text-xs uppercase tracking-wide text-brand-secondary-0">
                    Officers & Directors
                  </div>
                  {hasPeople ? (
                    <div className="space-y-3">
                      {data.irs_people.map((person) => {
                        const claimEmail = claimsByPersonId.get(person.id);
                        return (
                          <div
                            key={person.id}
                            className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-inset px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-sm font-medium text-text-on-light">
                                  {person.name}
                                </div>
                                <div className="text-xs text-brand-secondary-0">
                                  {person.title ?? person.role}
                                </div>
                              </div>
                              {claimEmail ? (
                                <span className="text-xs font-semibold text-brand-secondary-0">
                                  Linked to {claimEmail}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="email"
                                value={personClaimEmails[person.id] ?? ""}
                                onChange={(event) =>
                                  setPersonClaimEmails((prev) => ({
                                    ...prev,
                                    [person.id]: event.target.value,
                                  }))
                                }
                                disabled={Boolean(claimEmail)}
                                placeholder="Board member email"
                                className="flex-1 rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-on-light disabled:cursor-not-allowed disabled:bg-surface-inset"
                              />
                              <button
                                type="button"
                                onClick={() => handlePersonClaim(person.id)}
                                disabled={
                                  actionLoading === `claim-${person.id}` ||
                                  Boolean(claimEmail)
                                }
                                className="rounded-lg border border-border-subtle px-3 py-2 text-sm font-semibold text-text-on-light transition hover:border-brand-primary-0 hover:text-brand-primary-0 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoading === `claim-${person.id}`
                                  ? "Saving..."
                                  : "Invite / Link"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-brand-secondary-0">
                      No officer/director records available yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-border-subtle px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-brand-secondary-0">
                        IRS Legal Name
                      </div>
                      <div className="text-sm font-medium text-text-on-light">
                        {irsLegalName}
                      </div>
                      <div className="mt-2 text-xs uppercase tracking-wide text-brand-secondary-0">
                        Entity Name
                      </div>
                      <div className="text-sm font-medium text-text-on-light">
                        {entityName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleOverrideToggle(
                          "legal_name",
                          irsLegalName,
                          !hasNameOverride,
                        )
                      }
                      disabled={
                        actionLoading === "override" || !canOverrideName
                      }
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        hasNameOverride
                          ? "bg-brand-accent-1 text-brand-primary-1"
                          : "bg-surface-inset text-text-on-light"
                      }`}
                    >
                      {hasNameOverride ? "Override On" : "Override Off"}
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-border-subtle px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-brand-secondary-0">
                        IRS Website
                      </div>
                      <div className="text-sm font-medium text-text-on-light">
                        {irsWebsite}
                      </div>
                      <div className="mt-2 text-xs uppercase tracking-wide text-brand-secondary-0">
                        Nonprofit Website
                      </div>
                      <div className="text-sm font-medium text-text-on-light">
                        {nonprofitWebsite}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleOverrideToggle(
                          "website_url",
                          irsWebsite,
                          !hasWebsiteOverride,
                        )
                      }
                      disabled={
                        actionLoading === "override" || !canOverrideWebsite
                      }
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        hasWebsiteOverride
                          ? "bg-brand-accent-1 text-brand-primary-1"
                          : "bg-surface-inset text-text-on-light"
                      }`}
                    >
                      {hasWebsiteOverride ? "Override On" : "Override Off"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleProgressUpdate("review", "complete")}
                  disabled={actionLoading === "progress-review"}
                  className="rounded-lg bg-brand-primary-0 px-4 py-2 text-sm font-semibold text-brand-primary-1 shadow-sm transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Mark Review Complete
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("activation")}
                  className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-semibold text-text-on-light transition hover:border-brand-primary-0 hover:text-brand-primary-0"
                >
                  Next: Activate
                </button>
              </div>
            </div>
          ) : null}

          {activeSection === "activation" ? (
            <div className="space-y-4">
              <header>
                <h2 className="text-lg font-semibold text-text-on-light">
                  Activate
                </h2>
                <p className="text-sm text-brand-secondary-0">
                  Activate the nonprofit when onboarding is complete.
                </p>
              </header>

              <div className="rounded-lg border border-border-subtle bg-surface-inset px-4 py-3 text-sm text-text-on-light">
                {data.entity.active
                  ? "This nonprofit is active."
                  : "This nonprofit is inactive."}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={actionLoading === "activate" || data.entity.active}
                  className="rounded-lg bg-brand-primary-0 px-4 py-2 text-sm font-semibold text-brand-primary-1 shadow-sm transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "activate" ? "Activating..." : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("identity")}
                  className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-semibold text-text-on-light transition hover:border-brand-primary-0 hover:text-brand-primary-0"
                >
                  Back to Identity
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
