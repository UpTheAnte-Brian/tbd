"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "@/app/components/loading-spinner";
import { useUser } from "@/app/hooks/useUser";
import type { BusinessBookkeepingSnapshot } from "@/domain/business/bookkeeping";

type Props = {
  entityId: string;
};

type MutationKind =
  | "profile"
  | "system"
  | "account"
  | "responsibility"
  | "close_template"
  | "close_period";

type EditorState = {
  kind: MutationKind;
  mode: "create" | "edit";
  id?: string;
};

type ProfileDraft = {
  legal_name: string;
  dba_name: string;
  ein: string;
  state_of_formation: string;
  entity_structure: string;
  fiscal_year_end_month: string;
  fiscal_year_end_day: string;
  bookkeeping_status: string;
  close_cadence: string;
  default_accounting_basis: string;
  notes: string;
};

type SystemDraft = {
  system_type: string;
  system_name: string;
  vendor_name: string;
  external_org_id: string;
  environment: string;
  is_primary: boolean;
  status: string;
  access_notes: string;
};

type AccountDraft = {
  system_id: string;
  account_type: string;
  account_name: string;
  institution_name: string;
  external_account_ref: string;
  masked_account_number: string;
  currency_code: string;
  is_active: boolean;
  is_reconcilable: boolean;
  reconciliation_cadence: string;
  notes: string;
};

type ResponsibilityDraft = {
  responsibility_type: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  system_id: string;
  account_id: string;
  is_primary: boolean;
  notes: string;
};

type CloseTemplateDraft = {
  name: string;
  description: string;
  close_frequency: string;
  is_active: boolean;
};

type ClosePeriodDraft = {
  period_start: string;
  period_end: string;
  period_label: string;
  status: string;
  notes: string;
};

const PROFILE_STATUS_OPTIONS = ["active", "paused", "archived"] as const;
const CLOSE_CADENCE_OPTIONS = [
  "monthly",
  "quarterly",
  "annual",
  "ad_hoc",
] as const;
const ACCOUNTING_BASIS_OPTIONS = ["cash", "accrual", "hybrid"] as const;
const SYSTEM_TYPE_OPTIONS = [
  "accounting",
  "bank",
  "credit_card",
  "payroll",
  "merchant_processor",
  "sales_tax",
  "erp",
  "inventory",
  "pos",
  "document_storage",
] as const;
const SYSTEM_STATUS_OPTIONS = ["active", "inactive", "retired"] as const;
const ACCOUNT_TYPE_OPTIONS = [
  "checking",
  "savings",
  "credit_card",
  "loan",
  "line_of_credit",
  "merchant_settlement",
  "petty_cash",
  "clearing",
] as const;
const RECONCILIATION_OPTIONS = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "annual",
  "ad_hoc",
] as const;
const RESPONSIBILITY_OPTIONS = [
  "owner",
  "bookkeeper",
  "reconciler",
  "depositor",
  "payroll_processor",
  "sales_tax_filer",
  "cpa",
  "approver",
  "bank_admin",
  "qb_admin",
] as const;
const CLOSE_PERIOD_STATUS_OPTIONS = [
  "open",
  "in_review",
  "closed",
  "blocked",
] as const;

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString();
}

function formatText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "—";
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ");
}

function toTitle(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildProfileDraft(
  profile: BusinessBookkeepingSnapshot["profile"] | null,
): ProfileDraft {
  return {
    legal_name: profile?.legal_name ?? "",
    dba_name: profile?.dba_name ?? "",
    ein: profile?.ein ?? "",
    state_of_formation: profile?.state_of_formation ?? "",
    entity_structure: profile?.entity_structure ?? "",
    fiscal_year_end_month: profile?.fiscal_year_end_month
      ? String(profile.fiscal_year_end_month)
      : "",
    fiscal_year_end_day: profile?.fiscal_year_end_day
      ? String(profile.fiscal_year_end_day)
      : "",
    bookkeeping_status: profile?.bookkeeping_status ?? "active",
    close_cadence: profile?.close_cadence ?? "monthly",
    default_accounting_basis: profile?.default_accounting_basis ?? "",
    notes: profile?.notes ?? "",
  };
}

function buildSystemDraft(
  system?: BusinessBookkeepingSnapshot["systems"][number] | null,
): SystemDraft {
  return {
    system_type: system?.system_type ?? "accounting",
    system_name: system?.system_name ?? "",
    vendor_name: system?.vendor_name ?? "",
    external_org_id: system?.external_org_id ?? "",
    environment: system?.environment ?? "",
    is_primary: system?.is_primary ?? false,
    status: system?.status ?? "active",
    access_notes: system?.access_notes ?? "",
  };
}

function buildAccountDraft(
  account?: BusinessBookkeepingSnapshot["accounts"][number] | null,
): AccountDraft {
  return {
    system_id: account?.system_id ?? "",
    account_type: account?.account_type ?? "checking",
    account_name: account?.account_name ?? "",
    institution_name: account?.institution_name ?? "",
    external_account_ref: account?.external_account_ref ?? "",
    masked_account_number: account?.masked_account_number ?? "",
    currency_code: account?.currency_code ?? "USD",
    is_active: account?.is_active ?? true,
    is_reconcilable: account?.is_reconcilable ?? true,
    reconciliation_cadence: account?.reconciliation_cadence ?? "monthly",
    notes: account?.notes ?? "",
  };
}

function buildResponsibilityDraft(
  responsibility?: BusinessBookkeepingSnapshot["responsibilities"][number] | null,
): ResponsibilityDraft {
  return {
    responsibility_type: responsibility?.responsibility_type ?? "owner",
    contact_name: responsibility?.contact_name ?? "",
    contact_email: responsibility?.contact_email ?? "",
    contact_phone: responsibility?.contact_phone ?? "",
    system_id: responsibility?.system_id ?? "",
    account_id: responsibility?.account_id ?? "",
    is_primary: responsibility?.is_primary ?? true,
    notes: responsibility?.notes ?? "",
  };
}

function buildCloseTemplateDraft(
  template?: BusinessBookkeepingSnapshot["closeTemplates"][number] | null,
): CloseTemplateDraft {
  return {
    name: template?.name ?? "",
    description: template?.description ?? "",
    close_frequency: template?.close_frequency ?? "monthly",
    is_active: template?.is_active ?? true,
  };
}

function buildClosePeriodDraft(
  period?: BusinessBookkeepingSnapshot["closePeriods"][number] | null,
): ClosePeriodDraft {
  return {
    period_start: period?.period_start ?? "",
    period_end: period?.period_end ?? "",
    period_label: period?.period_label ?? "",
    status: period?.status ?? "open",
    notes: period?.notes ?? "",
  };
}

function Section({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-text-on-light">{title}</h3>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="rounded-lg bg-surface-accent px-3 py-2 text-sm font-semibold text-text-on-dark transition hover:bg-brand-primary-2"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FormCard({
  title,
  children,
  onCancel,
  onSave,
  saving,
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
      <div className="mb-4 text-sm font-semibold text-text-on-light">{title}</div>
      <div className="space-y-4">{children}</div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-surface-accent px-4 py-2 text-sm font-semibold text-text-on-dark transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-border-subtle bg-surface-card px-4 py-2 text-sm font-semibold text-text-on-light transition hover:bg-surface-inset disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Label({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm text-brand-secondary-0">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-on-light placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1 ${
        props.className ?? ""
      }`}
    />
  );
}

function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-on-light focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1 ${
        props.className ?? ""
      }`}
    />
  );
}

function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-on-light placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1 ${
        props.className ?? ""
      }`}
    />
  );
}

export default function EntityBookkeepingTab({ entityId }: Props) {
  const { user } = useUser();
  const [snapshot, setSnapshot] = useState<BusinessBookkeepingSnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState<MutationKind | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(
    buildProfileDraft(null),
  );
  const [systemDraft, setSystemDraft] = useState<SystemDraft>(
    buildSystemDraft(null),
  );
  const [accountDraft, setAccountDraft] = useState<AccountDraft>(
    buildAccountDraft(null),
  );
  const [responsibilityDraft, setResponsibilityDraft] =
    useState<ResponsibilityDraft>(buildResponsibilityDraft(null));
  const [closeTemplateDraft, setCloseTemplateDraft] =
    useState<CloseTemplateDraft>(buildCloseTemplateDraft(null));
  const [closePeriodDraft, setClosePeriodDraft] = useState<ClosePeriodDraft>(
    buildClosePeriodDraft(null),
  );

  const entityUserRole = useMemo(
    () => user?.entity_users?.find((eu) => eu.entity_id === entityId)?.role ?? null,
    [entityId, user?.entity_users],
  );

  const canEdit = useMemo(
    () => user?.global_role === "admin" || entityUserRole === "admin",
    [entityUserRole, user?.global_role],
  );

  const fetchSnapshot = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/entities/${entityId}/bookkeeping`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to load bookkeeping");
      }
      const json = (await res.json()) as BusinessBookkeepingSnapshot;
      setSnapshot(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSnapshot();
  }, [entityId]);

  const submitMutation = async (
    kind: MutationKind,
    payload: Record<string, unknown>,
    successMessage: string,
  ) => {
    setSaving(kind);
    try {
      const res = await fetch(`/api/entities/${entityId}/bookkeeping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to save bookkeeping data");
      }
      const json = (await res.json()) as BusinessBookkeepingSnapshot;
      setSnapshot(json);
      setEditor(null);
      toast.success(successMessage);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save bookkeeping data",
      );
    } finally {
      setSaving(null);
    }
  };

  const profile = snapshot?.profile ?? null;

  const openProfileForm = () => {
    setProfileDraft(buildProfileDraft(profile));
    setEditor({ kind: "profile", mode: profile ? "edit" : "create" });
  };

  const openSystemCreate = () => {
    setSystemDraft(buildSystemDraft(null));
    setEditor({ kind: "system", mode: "create" });
  };

  const openSystemEdit = (system: BusinessBookkeepingSnapshot["systems"][number]) => {
    setSystemDraft(buildSystemDraft(system));
    setEditor({ kind: "system", mode: "edit", id: system.id });
  };

  const openAccountCreate = () => {
    setAccountDraft(buildAccountDraft(null));
    setEditor({ kind: "account", mode: "create" });
  };

  const openAccountEdit = (
    account: BusinessBookkeepingSnapshot["accounts"][number],
  ) => {
    setAccountDraft(buildAccountDraft(account));
    setEditor({ kind: "account", mode: "edit", id: account.id });
  };

  const openResponsibilityCreate = () => {
    setResponsibilityDraft(buildResponsibilityDraft(null));
    setEditor({ kind: "responsibility", mode: "create" });
  };

  const openResponsibilityEdit = (
    responsibility: BusinessBookkeepingSnapshot["responsibilities"][number],
  ) => {
    setResponsibilityDraft(buildResponsibilityDraft(responsibility));
    setEditor({
      kind: "responsibility",
      mode: "edit",
      id: responsibility.id,
    });
  };

  const openCloseTemplateCreate = () => {
    setCloseTemplateDraft(buildCloseTemplateDraft(null));
    setEditor({ kind: "close_template", mode: "create" });
  };

  const openCloseTemplateEdit = (
    template: BusinessBookkeepingSnapshot["closeTemplates"][number],
  ) => {
    setCloseTemplateDraft(buildCloseTemplateDraft(template));
    setEditor({ kind: "close_template", mode: "edit", id: template.id });
  };

  const openClosePeriodCreate = () => {
    setClosePeriodDraft(buildClosePeriodDraft(null));
    setEditor({ kind: "close_period", mode: "create" });
  };

  const openClosePeriodEdit = (
    period: BusinessBookkeepingSnapshot["closePeriods"][number],
  ) => {
    setClosePeriodDraft(buildClosePeriodDraft(period));
    setEditor({ kind: "close_period", mode: "edit", id: period.id });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-sm text-brand-primary-2">{error}</div>;
  }

  if (!snapshot) {
    return (
      <div className="text-sm text-brand-secondary-0 opacity-70">
        Bookkeeping data not available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canEdit ? (
        <div className="rounded-xl border border-border-subtle bg-surface-inset px-4 py-3 text-sm text-brand-secondary-0">
          Business admin tools are enabled for this tab.
        </div>
      ) : null}

      <Section
        title="Profile"
        actionLabel={
          canEdit && editor?.kind !== "profile"
            ? profile
              ? "Edit Profile"
              : "Create Profile"
            : undefined
        }
        onAction={canEdit ? openProfileForm : undefined}
      >
        {editor?.kind === "profile" ? (
          <FormCard
            title={
              editor.mode === "edit"
                ? "Edit bookkeeping profile"
                : "Create bookkeeping profile"
            }
            onCancel={() => setEditor(null)}
            onSave={() =>
              submitMutation(
                "profile",
                profileDraft,
                editor.mode === "edit" ? "Profile updated" : "Profile created",
              )
            }
            saving={saving === "profile"}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Label label="Legal Name">
                <Input
                  value={profileDraft.legal_name}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      legal_name: event.target.value,
                    }))}
                />
              </Label>
              <Label label="DBA">
                <Input
                  value={profileDraft.dba_name}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      dba_name: event.target.value,
                    }))}
                />
              </Label>
              <Label label="EIN">
                <Input
                  value={profileDraft.ein}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      ein: event.target.value,
                    }))}
                />
              </Label>
              <Label label="State of Formation">
                <Input
                  value={profileDraft.state_of_formation}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      state_of_formation: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Structure">
                <Input
                  value={profileDraft.entity_structure}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      entity_structure: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Accounting Basis">
                <Select
                  value={profileDraft.default_accounting_basis}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      default_accounting_basis: event.target.value,
                    }))}
                >
                  <option value="">Not set</option>
                  {ACCOUNTING_BASIS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Close Cadence">
                <Select
                  value={profileDraft.close_cadence}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      close_cadence: event.target.value,
                    }))}
                >
                  {CLOSE_CADENCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Status">
                <Select
                  value={profileDraft.bookkeeping_status}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      bookkeeping_status: event.target.value,
                    }))}
                >
                  {PROFILE_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Fiscal Year End Month">
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={profileDraft.fiscal_year_end_month}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      fiscal_year_end_month: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Fiscal Year End Day">
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={profileDraft.fiscal_year_end_day}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      fiscal_year_end_day: event.target.value,
                    }))}
                />
              </Label>
            </div>
            <Label label="Notes">
              <Textarea
                rows={4}
                value={profileDraft.notes}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))}
              />
            </Label>
          </FormCard>
        ) : null}

        {profile ? (
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-brand-secondary-0 opacity-70">Legal Name</dt>
              <dd className="font-medium text-brand-secondary-0">
                {formatText(profile.legal_name)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary-0 opacity-70">DBA</dt>
              <dd className="font-medium text-brand-secondary-0">
                {formatText(profile.dba_name)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary-0 opacity-70">EIN</dt>
              <dd className="font-medium text-brand-secondary-0">
                {formatText(profile.ein)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary-0 opacity-70">
                State of Formation
              </dt>
              <dd className="font-medium text-brand-secondary-0">
                {formatText(profile.state_of_formation)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary-0 opacity-70">Structure</dt>
              <dd className="font-medium text-brand-secondary-0">
                {formatText(profile.entity_structure)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary-0 opacity-70">
                Accounting Basis
              </dt>
              <dd className="font-medium capitalize text-brand-secondary-0">
                {formatText(profile.default_accounting_basis)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary-0 opacity-70">Close Cadence</dt>
              <dd className="font-medium capitalize text-brand-secondary-0">
                {formatStatus(profile.close_cadence)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary-0 opacity-70">Status</dt>
              <dd className="font-medium capitalize text-brand-secondary-0">
                {formatStatus(profile.bookkeeping_status)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-brand-secondary-0 opacity-70">
            No business bookkeeping profile has been created yet.
          </p>
        )}
      </Section>

      <Section
        title={`Systems (${snapshot.systems.length})`}
        actionLabel={canEdit && editor?.kind !== "system" ? "Add System" : undefined}
        onAction={canEdit ? openSystemCreate : undefined}
      >
        {editor?.kind === "system" ? (
          <FormCard
            title={
              editor.mode === "edit"
                ? "Edit bookkeeping system"
                : "Add bookkeeping system"
            }
            onCancel={() => setEditor(null)}
            onSave={() =>
              submitMutation(
                "system",
                editor.mode === "edit"
                  ? { id: editor.id, ...systemDraft }
                  : systemDraft,
                editor.mode === "edit" ? "System updated" : "System added",
              )
            }
            saving={saving === "system"}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Label label="System Type">
                <Select
                  value={systemDraft.system_type}
                  onChange={(event) =>
                    setSystemDraft((current) => ({
                      ...current,
                      system_type: event.target.value,
                    }))}
                >
                  {SYSTEM_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="System Name">
                <Input
                  value={systemDraft.system_name}
                  onChange={(event) =>
                    setSystemDraft((current) => ({
                      ...current,
                      system_name: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Vendor Name">
                <Input
                  value={systemDraft.vendor_name}
                  onChange={(event) =>
                    setSystemDraft((current) => ({
                      ...current,
                      vendor_name: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Environment">
                <Input
                  value={systemDraft.environment}
                  onChange={(event) =>
                    setSystemDraft((current) => ({
                      ...current,
                      environment: event.target.value,
                    }))}
                />
              </Label>
              <Label label="External Org ID">
                <Input
                  value={systemDraft.external_org_id}
                  onChange={(event) =>
                    setSystemDraft((current) => ({
                      ...current,
                      external_org_id: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Status">
                <Select
                  value={systemDraft.status}
                  onChange={(event) =>
                    setSystemDraft((current) => ({
                      ...current,
                      status: event.target.value,
                    }))}
                >
                  {SYSTEM_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-secondary-0">
              <input
                type="checkbox"
                checked={systemDraft.is_primary}
                onChange={(event) =>
                  setSystemDraft((current) => ({
                    ...current,
                    is_primary: event.target.checked,
                  }))}
              />
              Primary system
            </label>
            <Label label="Access Notes">
              <Textarea
                rows={3}
                value={systemDraft.access_notes}
                onChange={(event) =>
                  setSystemDraft((current) => ({
                    ...current,
                    access_notes: event.target.value,
                  }))}
              />
            </Label>
          </FormCard>
        ) : null}

        {snapshot.systems.length === 0 ? (
          <p className="text-sm text-brand-secondary-0 opacity-70">
            No systems recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {snapshot.systems.map((system) => (
              <div
                key={system.id}
                className="rounded-xl border border-border-subtle bg-surface-inset p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-on-light">
                      {system.system_name}
                    </p>
                    <p className="text-sm capitalize text-brand-secondary-0 opacity-70">
                      {formatStatus(system.system_type)}
                      {system.vendor_name ? ` · ${system.vendor_name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => openSystemEdit(system)}
                        className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-on-light transition hover:bg-surface-page"
                      >
                        Edit
                      </button>
                    ) : null}
                    <span className="rounded-full bg-surface-nav px-2 py-1 text-xs uppercase tracking-wide text-text-on-dark">
                      {formatStatus(system.status)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <p>
                    <span className="opacity-70">Owner:</span>{" "}
                    {formatText(system.owner_person_name ?? system.owner_user_name)}
                  </p>
                  <p>
                    <span className="opacity-70">Environment:</span>{" "}
                    {formatText(system.environment)}
                  </p>
                  <p>
                    <span className="opacity-70">External Org ID:</span>{" "}
                    {formatText(system.external_org_id)}
                  </p>
                  <p>
                    <span className="opacity-70">Primary:</span>{" "}
                    {system.is_primary ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title={`Accounts (${snapshot.accounts.length})`}
        actionLabel={canEdit && editor?.kind !== "account" ? "Add Account" : undefined}
        onAction={canEdit ? openAccountCreate : undefined}
      >
        {editor?.kind === "account" ? (
          <FormCard
            title={
              editor.mode === "edit"
                ? "Edit financial account"
                : "Add financial account"
            }
            onCancel={() => setEditor(null)}
            onSave={() =>
              submitMutation(
                "account",
                editor.mode === "edit"
                  ? { id: editor.id, ...accountDraft }
                  : accountDraft,
                editor.mode === "edit" ? "Account updated" : "Account added",
              )
            }
            saving={saving === "account"}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Label label="Account Type">
                <Select
                  value={accountDraft.account_type}
                  onChange={(event) =>
                    setAccountDraft((current) => ({
                      ...current,
                      account_type: event.target.value,
                    }))}
                >
                  {ACCOUNT_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Account Name">
                <Input
                  value={accountDraft.account_name}
                  onChange={(event) =>
                    setAccountDraft((current) => ({
                      ...current,
                      account_name: event.target.value,
                    }))}
                />
              </Label>
              <Label label="System">
                <Select
                  value={accountDraft.system_id}
                  onChange={(event) =>
                    setAccountDraft((current) => ({
                      ...current,
                      system_id: event.target.value,
                    }))}
                >
                  <option value="">No linked system</option>
                  {snapshot.systems.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.system_name}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Institution Name">
                <Input
                  value={accountDraft.institution_name}
                  onChange={(event) =>
                    setAccountDraft((current) => ({
                      ...current,
                      institution_name: event.target.value,
                    }))}
                />
              </Label>
              <Label label="External Account Ref">
                <Input
                  value={accountDraft.external_account_ref}
                  onChange={(event) =>
                    setAccountDraft((current) => ({
                      ...current,
                      external_account_ref: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Masked Account Number">
                <Input
                  value={accountDraft.masked_account_number}
                  onChange={(event) =>
                    setAccountDraft((current) => ({
                      ...current,
                      masked_account_number: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Currency Code">
                <Input
                  value={accountDraft.currency_code}
                  onChange={(event) =>
                    setAccountDraft((current) => ({
                      ...current,
                      currency_code: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Reconciliation Cadence">
                <Select
                  value={accountDraft.reconciliation_cadence}
                  onChange={(event) =>
                    setAccountDraft((current) => ({
                      ...current,
                      reconciliation_cadence: event.target.value,
                    }))}
                >
                  {RECONCILIATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-brand-secondary-0">
                <input
                  type="checkbox"
                  checked={accountDraft.is_active}
                  onChange={(event) =>
                    setAccountDraft((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))}
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm text-brand-secondary-0">
                <input
                  type="checkbox"
                  checked={accountDraft.is_reconcilable}
                  onChange={(event) =>
                    setAccountDraft((current) => ({
                      ...current,
                      is_reconcilable: event.target.checked,
                    }))}
                />
                Reconcilable
              </label>
            </div>
            <Label label="Notes">
              <Textarea
                rows={3}
                value={accountDraft.notes}
                onChange={(event) =>
                  setAccountDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))}
              />
            </Label>
          </FormCard>
        ) : null}

        {snapshot.accounts.length === 0 ? (
          <p className="text-sm text-brand-secondary-0 opacity-70">
            No financial accounts recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-brand-secondary-0 opacity-70">
                <tr>
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Institution</th>
                  <th className="px-3 py-2">System</th>
                  <th className="px-3 py-2">Reconcile</th>
                  {canEdit ? <th className="px-3 py-2">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {snapshot.accounts.map((account) => (
                  <tr key={account.id} className="border-t border-border-subtle">
                    <td className="px-3 py-2 font-medium text-text-on-light">
                      {account.account_name}
                    </td>
                    <td className="px-3 py-2 capitalize text-text-on-light">
                      {formatStatus(account.account_type)}
                    </td>
                    <td className="px-3 py-2 text-text-on-light">
                      {formatText(account.institution_name)}
                    </td>
                    <td className="px-3 py-2 text-text-on-light">
                      {formatText(account.system_name)}
                    </td>
                    <td className="px-3 py-2 text-text-on-light">
                      {account.is_reconcilable
                        ? formatStatus(account.reconciliation_cadence)
                        : "No"}
                    </td>
                    {canEdit ? (
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => openAccountEdit(account)}
                          className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-on-light transition hover:bg-surface-page"
                        >
                          Edit
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title={`Responsibilities (${snapshot.responsibilities.length})`}
        actionLabel={
          canEdit && editor?.kind !== "responsibility"
            ? "Add Responsibility"
            : undefined
        }
        onAction={canEdit ? openResponsibilityCreate : undefined}
      >
        {editor?.kind === "responsibility" ? (
          <FormCard
            title={
              editor.mode === "edit" ? "Edit responsibility" : "Add responsibility"
            }
            onCancel={() => setEditor(null)}
            onSave={() =>
              submitMutation(
                "responsibility",
                editor.mode === "edit"
                  ? { id: editor.id, ...responsibilityDraft }
                  : responsibilityDraft,
                editor.mode === "edit"
                  ? "Responsibility updated"
                  : "Responsibility added",
              )
            }
            saving={saving === "responsibility"}
          >
            <p className="text-sm text-brand-secondary-0 opacity-80">
              Responsibilities assign a person or contact to an area of ownership.
              Linking a system or account scopes that ownership. It does not create a task.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <Label label="Responsibility Type">
                <Select
                  value={responsibilityDraft.responsibility_type}
                  onChange={(event) =>
                    setResponsibilityDraft((current) => ({
                      ...current,
                      responsibility_type: event.target.value,
                    }))}
                >
                  {RESPONSIBILITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Contact Name">
                <Input
                  value={responsibilityDraft.contact_name}
                  onChange={(event) =>
                    setResponsibilityDraft((current) => ({
                      ...current,
                      contact_name: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Contact Email">
                <Input
                  value={responsibilityDraft.contact_email}
                  onChange={(event) =>
                    setResponsibilityDraft((current) => ({
                      ...current,
                      contact_email: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Contact Phone">
                <Input
                  value={responsibilityDraft.contact_phone}
                  onChange={(event) =>
                    setResponsibilityDraft((current) => ({
                      ...current,
                      contact_phone: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Related System">
                <Select
                  value={responsibilityDraft.system_id}
                  onChange={(event) =>
                    setResponsibilityDraft((current) => ({
                      ...current,
                      system_id: event.target.value,
                    }))}
                >
                  <option value="">No linked system</option>
                  {snapshot.systems.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.system_name}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Related Account">
                <Select
                  value={responsibilityDraft.account_id}
                  onChange={(event) =>
                    setResponsibilityDraft((current) => ({
                      ...current,
                      account_id: event.target.value,
                    }))}
                >
                  <option value="">No linked account</option>
                  {snapshot.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-secondary-0">
              <input
                type="checkbox"
                checked={responsibilityDraft.is_primary}
                onChange={(event) =>
                  setResponsibilityDraft((current) => ({
                    ...current,
                    is_primary: event.target.checked,
                  }))}
              />
              Primary owner for this responsibility type
            </label>
            <Label label="Notes">
              <Textarea
                rows={3}
                value={responsibilityDraft.notes}
                onChange={(event) =>
                  setResponsibilityDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))}
              />
            </Label>
          </FormCard>
        ) : null}

        {snapshot.responsibilities.length === 0 ? (
          <p className="text-sm text-brand-secondary-0 opacity-70">
            No responsibilities recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {snapshot.responsibilities.map((responsibility) => (
              <div
                key={responsibility.id}
                className="rounded-xl border border-border-subtle bg-surface-inset p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize text-brand-secondary-0">
                      {formatStatus(responsibility.responsibility_type)}
                    </p>
                    <p className="text-sm text-brand-secondary-0 opacity-70">
                      {formatText(
                        responsibility.person_name ??
                          responsibility.user_name ??
                          responsibility.contact_name,
                        )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => openResponsibilityEdit(responsibility)}
                        className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-on-light transition hover:bg-surface-page"
                      >
                        Edit
                      </button>
                    ) : null}
                    {responsibility.is_primary ? (
                      <span className="rounded-full bg-surface-nav px-2 py-1 text-xs uppercase tracking-wide text-text-on-dark">
                        Primary
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <p>
                    <span className="opacity-70">System:</span>{" "}
                    {formatText(responsibility.system_name)}
                  </p>
                  <p>
                    <span className="opacity-70">Account:</span>{" "}
                    {formatText(responsibility.account_name)}
                  </p>
                  <p>
                    <span className="opacity-70">Email:</span>{" "}
                    {formatText(responsibility.contact_email)}
                  </p>
                  <p>
                    <span className="opacity-70">Phone:</span>{" "}
                    {formatText(responsibility.contact_phone)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title={`Close Templates (${snapshot.closeTemplates.length})`}
        actionLabel={
          canEdit && editor?.kind !== "close_template" ? "Add Template" : undefined
        }
        onAction={canEdit ? openCloseTemplateCreate : undefined}
      >
        {editor?.kind === "close_template" ? (
          <FormCard
            title={
              editor.mode === "edit" ? "Edit close template" : "Add close template"
            }
            onCancel={() => setEditor(null)}
            onSave={() =>
              submitMutation(
                "close_template",
                editor.mode === "edit"
                  ? { id: editor.id, ...closeTemplateDraft }
                  : closeTemplateDraft,
                editor.mode === "edit"
                  ? "Close template updated"
                  : "Close template added",
              )
            }
            saving={saving === "close_template"}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Label label="Template Name">
                <Input
                  value={closeTemplateDraft.name}
                  onChange={(event) =>
                    setCloseTemplateDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Frequency">
                <Select
                  value={closeTemplateDraft.close_frequency}
                  onChange={(event) =>
                    setCloseTemplateDraft((current) => ({
                      ...current,
                      close_frequency: event.target.value,
                    }))}
                >
                  {CLOSE_CADENCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-secondary-0">
              <input
                type="checkbox"
                checked={closeTemplateDraft.is_active}
                onChange={(event) =>
                  setCloseTemplateDraft((current) => ({
                    ...current,
                    is_active: event.target.checked,
                  }))}
              />
              Active template
            </label>
            <Label label="Description">
              <Textarea
                rows={3}
                value={closeTemplateDraft.description}
                onChange={(event) =>
                  setCloseTemplateDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))}
              />
            </Label>
          </FormCard>
        ) : null}

        {snapshot.closeTemplates.length === 0 ? (
          <p className="text-sm text-brand-secondary-0 opacity-70">
            No close templates recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {snapshot.closeTemplates.map((template) => (
              <div
                key={template.id}
                className="rounded-xl border border-border-subtle bg-surface-inset p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-secondary-0">
                      {template.name}
                    </p>
                    <p className="text-sm text-brand-secondary-0 opacity-70">
                      {template.tasks.length} tasks ·{" "}
                      {formatStatus(template.close_frequency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => openCloseTemplateEdit(template)}
                        className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-on-light transition hover:bg-surface-page"
                      >
                        Edit
                      </button>
                    ) : null}
                    <span className="rounded-full bg-surface-nav px-2 py-1 text-xs uppercase tracking-wide text-text-on-dark">
                      {template.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                {template.description ? (
                  <p className="mt-3 text-sm text-brand-secondary-0 opacity-80">
                    {template.description}
                  </p>
                ) : null}
                {template.tasks.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {template.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-on-light"
                      >
                        <p className="font-medium">{task.title}</p>
                        <p className="opacity-70">
                          {formatStatus(task.task_type)}
                          {task.account_name ? ` · ${task.account_name}` : ""}
                          {task.system_name ? ` · ${task.system_name}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title={`Recent Close Periods (${snapshot.closePeriods.length})`}
        actionLabel={
          canEdit && editor?.kind !== "close_period" ? "Add Close Period" : undefined
        }
        onAction={canEdit ? openClosePeriodCreate : undefined}
      >
        {editor?.kind === "close_period" ? (
          <FormCard
            title={
              editor.mode === "edit" ? "Edit close period" : "Add close period"
            }
            onCancel={() => setEditor(null)}
            onSave={() =>
              submitMutation(
                "close_period",
                editor.mode === "edit"
                  ? { id: editor.id, ...closePeriodDraft }
                  : closePeriodDraft,
                editor.mode === "edit"
                  ? "Close period updated"
                  : "Close period added",
              )
            }
            saving={saving === "close_period"}
          >
            <p className="text-sm text-brand-secondary-0 opacity-80">
              Create one close period for each month, quarter, or ad hoc cycle
              you want to track through reconciliation and close.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <Label label="Period Start">
                <Input
                  type="date"
                  value={closePeriodDraft.period_start}
                  onChange={(event) =>
                    setClosePeriodDraft((current) => ({
                      ...current,
                      period_start: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Period End">
                <Input
                  type="date"
                  value={closePeriodDraft.period_end}
                  onChange={(event) =>
                    setClosePeriodDraft((current) => ({
                      ...current,
                      period_end: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Period Label">
                <Input
                  value={closePeriodDraft.period_label}
                  onChange={(event) =>
                    setClosePeriodDraft((current) => ({
                      ...current,
                      period_label: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Status">
                <Select
                  value={closePeriodDraft.status}
                  onChange={(event) =>
                    setClosePeriodDraft((current) => ({
                      ...current,
                      status: event.target.value,
                    }))}
                >
                  {CLOSE_PERIOD_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>
            <Label label="Notes">
              <Textarea
                rows={3}
                value={closePeriodDraft.notes}
                onChange={(event) =>
                  setClosePeriodDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))}
              />
            </Label>
          </FormCard>
        ) : null}

        {snapshot.closePeriods.length === 0 ? (
          <p className="text-sm text-brand-secondary-0 opacity-70">
            No close periods recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {snapshot.closePeriods.map((period) => (
              <div
                key={period.id}
                className="rounded-xl border border-border-subtle bg-surface-inset p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-secondary-0">
                      {period.period_label}
                    </p>
                    <p className="text-sm text-brand-secondary-0 opacity-70">
                      {formatDate(period.period_start)} to{" "}
                      {formatDate(period.period_end)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => openClosePeriodEdit(period)}
                        className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-on-light transition hover:bg-surface-page"
                      >
                        Edit
                      </button>
                    ) : null}
                    <span className="rounded-full bg-surface-nav px-2 py-1 text-xs uppercase tracking-wide text-text-on-dark">
                      {formatStatus(period.status)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <p>
                    <span className="opacity-70">Owner:</span>{" "}
                    {formatText(period.owner_user_name)}
                  </p>
                  <p>
                    <span className="opacity-70">Opened:</span>{" "}
                    {formatDate(period.opened_at)}
                  </p>
                  <p>
                    <span className="opacity-70">Closed:</span>{" "}
                    {formatDate(period.closed_at)}
                  </p>
                  <p>
                    <span className="opacity-70">Tasks:</span> {period.tasks.length}
                  </p>
                </div>
                {period.notes ? (
                  <p className="mt-3 text-sm text-brand-secondary-0 opacity-80">
                    {period.notes}
                  </p>
                ) : null}
                {period.tasks.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {period.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-on-light"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <p className="font-medium">{task.title}</p>
                          <span className="capitalize opacity-70">
                            {formatStatus(task.status)}
                          </span>
                        </div>
                        <p className="opacity-70">
                          {formatText(
                            task.assigned_user_name ?? task.assigned_person_name,
                          )}
                          {task.account_name ? ` · ${task.account_name}` : ""}
                          {task.system_name ? ` · ${task.system_name}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
