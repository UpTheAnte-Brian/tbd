"use client";

import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "@/app/components/loading-spinner";
import { useUser } from "@/app/hooks/useUser";
import { entityPath } from "@/app/lib/routes";
import type { BusinessBookkeepingSnapshot } from "@/domain/business/bookkeeping";
import type { EntityDirectoryRow } from "@/app/lib/types/entity-directory";

type Props = {
  entityId: string;
};

type MutationKind =
  | "service_engagement"
  | "time_entry"
  | "invoice"
  | "profile"
  | "system"
  | "account"
  | "responsibility"
  | "recurring_task"
  | "recurring_task_complete"
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

type RecurringTaskDraft = {
  title: string;
  task_type: string;
  description: string;
  cadence: string;
  interval_count: string;
  anchor_date: string;
  responsibility_id: string;
  system_id: string;
  account_id: string;
  is_active: boolean;
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

type ServiceEngagementDraft = {
  title: string;
  client_entity_id: string;
  service_type: string;
  billing_model: string;
  default_hourly_rate: string;
  currency_code: string;
  invoice_terms_days: string;
  invoice_prefix: string;
  contact_name: string;
  contact_email: string;
  is_active: boolean;
  notes: string;
};

type TimeEntryDraft = {
  engagement_id: string;
  work_date: string;
  hours: string;
  hourly_rate: string;
  description: string;
  billable: boolean;
  invoice_id: string;
};

type InvoiceDraft = {
  engagement_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  issued_on: string;
  due_on: string;
  status: string;
  notes: string;
  selected_time_entry_ids: string[];
};

const PROFILE_STATUS_OPTIONS = ["active", "paused", "archived"] as const;
const SERVICE_TYPE_OPTIONS = [
  "bookkeeping",
  "advisory",
  "fractional_finance",
  "operations",
  "other",
] as const;
const BILLING_MODEL_OPTIONS = ["hourly", "fixed_fee", "retainer"] as const;
const INVOICE_STATUS_OPTIONS = ["draft", "sent", "paid", "void"] as const;
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
const RECURRING_TASK_TYPE_OPTIONS = [
  "bill_payment",
  "vendor_payable",
  "profit_share",
  "tax_filing",
  "payroll",
  "transfer",
  "reconciliation",
  "reporting",
  "review",
  "other",
] as const;
const RECURRING_TASK_CADENCE_OPTIONS = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "annual",
] as const;
const CLOSE_PERIOD_STATUS_OPTIONS = [
  "open",
  "in_review",
  "closed",
  "blocked",
] as const;

type RecurringTaskStatus =
  | "inactive"
  | "overdue"
  | "due_today"
  | "due_soon"
  | "scheduled"
  | "completed";

type RecurringTaskView = {
  task: BusinessBookkeepingSnapshot["recurringTasks"][number];
  activeDueDate: string | null;
  nextDueDate: string | null;
  isCompleteForActiveCycle: boolean;
  status: RecurringTaskStatus;
  statusLabel: string;
  daysUntilDue: number | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsedDateOnly = parseDateOnly(value);
    if (!parsedDateOnly) return "—";
    return parsedDateOnly.toLocaleDateString(undefined, {
      timeZone: "UTC",
    });
  }
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

function formatMoney(
  value: number | null | undefined,
  currency = "USD",
) {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeValue);
  } catch {
    return `$${safeValue.toFixed(2)}`;
  }
}

function formatHours(value: number | null | undefined) {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `${safeValue.toFixed(2)} h`;
}

function getEngagementCounterparty(
  engagement: BusinessBookkeepingSnapshot["serviceEngagements"][number],
) {
  if (engagement.current_entity_role === "provider") {
    return {
      entityId: engagement.client_entity_id,
      entityLabel: formatText(engagement.client_entity_name),
      roleLabel: "Client",
    };
  }

  return {
    entityId: engagement.entity_id,
    entityLabel: formatText(engagement.provider_entity_name),
    roleLabel: "Provider",
  };
}

function toTitle(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getRecurringTaskBadgeClass(status: RecurringTaskStatus) {
  switch (status) {
    case "overdue":
      return "bg-red-100 text-red-800";
    case "due_today":
      return "bg-amber-100 text-amber-900";
    case "due_soon":
      return "bg-yellow-100 text-yellow-900";
    case "completed":
      return "bg-emerald-100 text-emerald-900";
    case "inactive":
      return "bg-slate-200 text-slate-700";
    case "scheduled":
    default:
      return "bg-surface-nav text-text-on-dark";
  }
}

function getInvoiceBadgeClass(status: string | null | undefined) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-900";
    case "sent":
      return "bg-blue-100 text-blue-900";
    case "void":
      return "bg-slate-200 text-slate-700";
    case "draft":
    default:
      return "bg-amber-100 text-amber-900";
  }
}

function formatRelativeDue(daysUntilDue: number | null) {
  if (daysUntilDue === null) return "No due date";
  if (daysUntilDue < 0) {
    const abs = Math.abs(daysUntilDue);
    return `${abs} day${abs === 1 ? "" : "s"} late`;
  }
  if (daysUntilDue === 0) return "Due today";
  if (daysUntilDue === 1) return "Due in 1 day";
  return `Due in ${daysUntilDue} days`;
}

function formatRecurringCadence(cadence: string, intervalCount: number) {
  const safeInterval = Math.max(intervalCount, 1);
  if (safeInterval === 1) {
    return `Every ${formatStatus(cadence)}`;
  }

  switch (cadence) {
    case "daily":
      return `Every ${safeInterval} days`;
    case "weekly":
      return `Every ${safeInterval} weeks`;
    case "monthly":
      return `Every ${safeInterval} months`;
    case "quarterly":
      return `Every ${safeInterval} quarters`;
    case "annual":
      return `Every ${safeInterval} years`;
    default:
      return `Every ${safeInterval} cycles`;
  }
}

function parseDateOnly(value: string | null | undefined) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonthsClamped(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfMonth = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDayOfMonth)),
  );
}

function compareDateKeys(left: string | null, right: string | null) {
  if (left === right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right);
}

function getDifferenceInDays(from: Date, to: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

function advanceRecurringTaskDueDate(
  date: Date,
  cadence: string,
  intervalCount: number,
) {
  const safeInterval = Math.max(intervalCount, 1);

  switch (cadence) {
    case "daily":
      return addDays(date, safeInterval);
    case "weekly":
      return addDays(date, safeInterval * 7);
    case "quarterly":
      return addMonthsClamped(date, safeInterval * 3);
    case "annual":
      return addMonthsClamped(date, safeInterval * 12);
    case "monthly":
    default:
      return addMonthsClamped(date, safeInterval);
  }
}

function getLatestDueOnOrBefore(
  task: BusinessBookkeepingSnapshot["recurringTasks"][number],
  todayKey: string,
) {
  const anchorDate = parseDateOnly(task.anchor_date);
  if (!anchorDate) return null;

  let current = anchorDate;
  let latest: Date | null = null;

  while (toDateKey(current) <= todayKey) {
    latest = current;
    current = advanceRecurringTaskDueDate(
      current,
      task.cadence,
      task.interval_count,
    );
  }

  return latest;
}

function buildRecurringTaskView(
  task: BusinessBookkeepingSnapshot["recurringTasks"][number],
  today: Date,
): RecurringTaskView {
  const todayKey = toDateKey(today);
  const latestDue = getLatestDueOnOrBefore(task, todayKey);
  const latestDueKey = latestDue ? toDateKey(latestDue) : null;
  const completedForDueDate = task.last_completed_for_due_date;
  const isCompleteForLatestDue =
    Boolean(latestDueKey) && completedForDueDate === latestDueKey;

  let activeDueDate: string | null;
  let nextDueDate: string | null;

  if (latestDueKey && !isCompleteForLatestDue) {
    activeDueDate = latestDueKey;
    nextDueDate = latestDueKey;
  } else if (latestDue) {
    const next = advanceRecurringTaskDueDate(
      latestDue,
      task.cadence,
      task.interval_count,
    );
    activeDueDate = toDateKey(next);
    nextDueDate = activeDueDate;
  } else {
    activeDueDate = task.anchor_date;
    nextDueDate = task.anchor_date;
  }

  if (!task.is_active) {
    const inactiveDue = activeDueDate ? parseDateOnly(activeDueDate) : null;
    return {
      task,
      activeDueDate,
      nextDueDate,
      isCompleteForActiveCycle: false,
      status: "inactive",
      statusLabel: "Inactive",
      daysUntilDue: inactiveDue ? getDifferenceInDays(today, inactiveDue) : null,
    };
  }

  const activeDue = parseDateOnly(activeDueDate);
  const daysUntilDue = activeDue ? getDifferenceInDays(today, activeDue) : null;

  if (latestDueKey && isCompleteForLatestDue) {
    return {
      task,
      activeDueDate,
      nextDueDate,
      isCompleteForActiveCycle: true,
      status: "completed",
      statusLabel: "Current cycle done",
      daysUntilDue,
    };
  }

  if (daysUntilDue === null) {
    return {
      task,
      activeDueDate,
      nextDueDate,
      isCompleteForActiveCycle: false,
      status: "scheduled",
      statusLabel: "Scheduled",
      daysUntilDue: null,
    };
  }

  if (daysUntilDue < 0) {
    return {
      task,
      activeDueDate,
      nextDueDate,
      isCompleteForActiveCycle: false,
      status: "overdue",
      statusLabel: "Overdue",
      daysUntilDue,
    };
  }

  if (daysUntilDue === 0) {
    return {
      task,
      activeDueDate,
      nextDueDate,
      isCompleteForActiveCycle: false,
      status: "due_today",
      statusLabel: "Due today",
      daysUntilDue,
    };
  }

  if (daysUntilDue <= 7) {
    return {
      task,
      activeDueDate,
      nextDueDate,
      isCompleteForActiveCycle: false,
      status: "due_soon",
      statusLabel: "Due soon",
      daysUntilDue,
    };
  }

  return {
    task,
    activeDueDate,
    nextDueDate,
    isCompleteForActiveCycle: false,
    status: "scheduled",
    statusLabel: "Scheduled",
    daysUntilDue,
  };
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

function buildRecurringTaskDraft(
  task?: BusinessBookkeepingSnapshot["recurringTasks"][number] | null,
): RecurringTaskDraft {
  return {
    title: task?.title ?? "",
    task_type: task?.task_type ?? "bill_payment",
    description: task?.description ?? "",
    cadence: task?.cadence ?? "monthly",
    interval_count: task?.interval_count ? String(task.interval_count) : "1",
    anchor_date: task?.anchor_date ?? "",
    responsibility_id: task?.responsibility_id ?? "",
    system_id: task?.system_id ?? "",
    account_id: task?.account_id ?? "",
    is_active: task?.is_active ?? true,
    notes: task?.notes ?? "",
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

function buildServiceEngagementDraft(
  engagement?: BusinessBookkeepingSnapshot["serviceEngagements"][number] | null,
): ServiceEngagementDraft {
  return {
    title: engagement?.title ?? "",
    client_entity_id: engagement?.client_entity_id ?? "",
    service_type: engagement?.service_type ?? "bookkeeping",
    billing_model: engagement?.billing_model ?? "hourly",
    default_hourly_rate:
      engagement?.default_hourly_rate !== null &&
        engagement?.default_hourly_rate !== undefined
        ? String(engagement.default_hourly_rate)
        : "",
    currency_code: engagement?.currency_code ?? "USD",
    invoice_terms_days:
      engagement?.invoice_terms_days !== undefined &&
        engagement?.invoice_terms_days !== null
        ? String(engagement.invoice_terms_days)
        : "30",
    invoice_prefix: engagement?.invoice_prefix ?? "",
    contact_name: engagement?.contact_name ?? "",
    contact_email: engagement?.contact_email ?? "",
    is_active: engagement?.is_active ?? true,
    notes: engagement?.notes ?? "",
  };
}

function buildTimeEntryDraft(
  entry?: BusinessBookkeepingSnapshot["timeEntries"][number] | null,
): TimeEntryDraft {
  return {
    engagement_id: entry?.engagement_id ?? "",
    work_date: entry?.work_date ?? "",
    hours:
      entry?.hours !== undefined && entry?.hours !== null
        ? String(entry.hours)
        : "",
    hourly_rate:
      entry?.hourly_rate !== undefined && entry?.hourly_rate !== null
        ? String(entry.hourly_rate)
        : "",
    description: entry?.description ?? "",
    billable: entry?.billable ?? true,
    invoice_id: entry?.invoice_id ?? "",
  };
}

function buildInvoiceDraft(
  invoice?: BusinessBookkeepingSnapshot["invoices"][number] | null,
): InvoiceDraft {
  return {
    engagement_id: invoice?.engagement_id ?? "",
    invoice_number: invoice?.invoice_number ?? "",
    period_start: invoice?.period_start ?? "",
    period_end: invoice?.period_end ?? "",
    issued_on: invoice?.issued_on ?? "",
    due_on: invoice?.due_on ?? "",
    status: invoice?.status ?? "draft",
    notes: invoice?.notes ?? "",
    selected_time_entry_ids: invoice?.time_entry_ids ?? [],
  };
}

function buildSuggestedDueOn(
  issuedOn: string | null | undefined,
  invoiceTermsDays: number | null | undefined,
) {
  const parsed = parseDateOnly(issuedOn);
  if (!parsed) return "";

  const safeTerms =
    typeof invoiceTermsDays === "number" && Number.isFinite(invoiceTermsDays)
      ? Math.max(invoiceTermsDays, 0)
      : 0;

  return toDateKey(addDays(parsed, safeTerms));
}

function buildSuggestedInvoiceNumber(
  engagement: BusinessBookkeepingSnapshot["serviceEngagements"][number] | null,
  invoices: BusinessBookkeepingSnapshot["invoices"],
) {
  if (!engagement) return "";

  const prefix = (engagement.invoice_prefix ?? "").trim() || "INV";
  const nextSequence =
    invoices.filter(
      (invoice) =>
        invoice.current_entity_role === "provider" &&
        invoice.engagement_id === engagement.id,
    ).length + 1;

  return `${prefix}-${String(nextSequence).padStart(3, "0")}`;
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

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input(props, ref) {
    return (
      <input
        {...props}
        ref={ref}
        className={`w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-on-light placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1 ${
          props.className ?? ""
        }`}
      />
    );
  },
);

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
  const [recurringTaskDraft, setRecurringTaskDraft] =
    useState<RecurringTaskDraft>(buildRecurringTaskDraft(null));
  const [closeTemplateDraft, setCloseTemplateDraft] =
    useState<CloseTemplateDraft>(buildCloseTemplateDraft(null));
  const [closePeriodDraft, setClosePeriodDraft] = useState<ClosePeriodDraft>(
    buildClosePeriodDraft(null),
  );
  const [serviceEngagementDraft, setServiceEngagementDraft] =
    useState<ServiceEngagementDraft>(buildServiceEngagementDraft(null));
  const [timeEntryDraft, setTimeEntryDraft] = useState<TimeEntryDraft>(
    buildTimeEntryDraft(null),
  );
  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceDraft>(
    buildInvoiceDraft(null),
  );
  const [businessOptions, setBusinessOptions] = useState<EntityDirectoryRow[]>([]);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractUploading, setContractUploading] = useState(false);
  const [contractFileInputKey, setContractFileInputKey] = useState(0);
  const [recurringTaskDocumentFile, setRecurringTaskDocumentFile] =
    useState<File | null>(null);
  const [recurringTaskDocumentUploading, setRecurringTaskDocumentUploading] =
    useState(false);
  const [recurringTaskDocumentInputKey, setRecurringTaskDocumentInputKey] =
    useState(0);
  const recurringTaskEditorRef = useRef<HTMLDivElement | null>(null);
  const recurringTaskTitleInputRef = useRef<HTMLInputElement | null>(null);

  const entityUserRole = useMemo(
    () => user?.entity_users?.find((eu) => eu.entity_id === entityId)?.role ?? null,
    [entityId, user?.entity_users],
  );

  const canEdit = useMemo(
    () => user?.global_role === "admin" || entityUserRole === "admin",
    [entityUserRole, user?.global_role],
  );
  // Provider-side billing tools are private admin-facing tools.
  const showInternalBillingTools = canEdit;

  const providerEngagements = useMemo(
    () =>
      (snapshot?.serviceEngagements ?? []).filter(
        (engagement) => engagement.current_entity_role === "provider",
      ),
    [snapshot?.serviceEngagements],
  );
  const clientSideEngagements = useMemo(
    () =>
      (snapshot?.serviceEngagements ?? []).filter(
        (engagement) => engagement.current_entity_role === "client",
      ),
    [snapshot?.serviceEngagements],
  );

  const canCreateProviderEngagement = canEdit;
  const profile = snapshot?.profile ?? null;

  const billingStats = useMemo(() => {
    const entries = snapshot?.timeEntries ?? [];
    const invoices = snapshot?.invoices ?? [];

    return {
      unbilledHours: entries
        .filter((entry) => entry.billable && !entry.invoice_id)
        .reduce((sum, entry) => sum + entry.hours, 0),
      unbilledAmount: entries
        .filter((entry) => entry.billable && !entry.invoice_id)
        .reduce((sum, entry) => sum + entry.amount, 0),
      draftInvoiceCount: invoices.filter((invoice) => invoice.status === "draft")
        .length,
      sentInvoiceCount: invoices.filter((invoice) => invoice.status === "sent")
        .length,
    };
  }, [snapshot?.invoices, snapshot?.timeEntries]);

  const invoiceAssignableEntries = useMemo(() => {
    const selectedEngagementId = invoiceDraft.engagement_id;
    if (!selectedEngagementId) return [];

    return (snapshot?.timeEntries ?? [])
      .filter((entry) =>
        entry.engagement_id === selectedEngagementId &&
        entry.current_entity_role === "provider" &&
        entry.billable &&
        (!entry.invoice_id || entry.invoice_id === editor?.id)
      )
      .sort((left, right) => {
        if (left.work_date !== right.work_date) {
          return right.work_date.localeCompare(left.work_date);
        }
        return right.created_at.localeCompare(left.created_at);
      });
  }, [editor?.id, invoiceDraft.engagement_id, snapshot?.timeEntries]);

  const recurringTaskViews = useMemo(() => {
    const today = new Date();
    const baseToday = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
    );

    return [...(snapshot?.recurringTasks ?? [])]
      .map((task) => buildRecurringTaskView(task, baseToday))
      .sort((left, right) => {
        const statusRank: Record<RecurringTaskStatus, number> = {
          overdue: 0,
          due_today: 1,
          due_soon: 2,
          scheduled: 3,
          completed: 4,
          inactive: 5,
        };

        const statusDiff = statusRank[left.status] - statusRank[right.status];
        if (statusDiff !== 0) return statusDiff;

        const dateDiff = compareDateKeys(left.activeDueDate, right.activeDueDate);
        if (dateDiff !== 0) return dateDiff;

        return left.task.title.localeCompare(right.task.title);
      });
  }, [snapshot?.recurringTasks]);

  const recurringTaskStats = useMemo(() => {
    return recurringTaskViews.reduce(
      (totals, task) => {
        totals.total += 1;
        if (task.status === "overdue") totals.overdue += 1;
        if (task.status === "due_today") totals.dueToday += 1;
        if (task.status === "due_soon") totals.dueSoon += 1;
        if (task.status === "completed") totals.completed += 1;
        if (task.status === "inactive") totals.inactive += 1;
        return totals;
      },
      {
        total: 0,
        overdue: 0,
        dueToday: 0,
        dueSoon: 0,
        completed: 0,
        inactive: 0,
      },
    );
  }, [recurringTaskViews]);

  const editingRecurringTask = useMemo(
    () =>
      editor?.kind === "recurring_task" && editor.mode === "edit"
        ? (snapshot?.recurringTasks.find((task) => task.id === editor.id) ?? null)
        : null,
    [editor, snapshot?.recurringTasks],
  );

  const selectedInvoiceEngagement = useMemo(
    () =>
      providerEngagements.find(
        (engagement) => engagement.id === invoiceDraft.engagement_id,
      ) ?? null,
    [invoiceDraft.engagement_id, providerEngagements],
  );

  useEffect(() => {
    let cancelled = false;

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
        if (!cancelled) {
          setSnapshot(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setSnapshot(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchSnapshot();

    return () => {
      cancelled = true;
    };
  }, [entityId]);

  useEffect(() => {
    let cancelled = false;

    const loadBusinessOptions = async () => {
      try {
        const res = await fetch("/api/entities?type=business", {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("Failed to load business options");
        }
        const json = (await res.json()) as EntityDirectoryRow[];
        if (!cancelled) {
          setBusinessOptions(
            json.filter((row) => row.entity_id !== entityId),
          );
        }
      } catch {
        if (!cancelled) {
          setBusinessOptions([]);
        }
      }
    };

    void loadBusinessOptions();

    return () => {
      cancelled = true;
    };
  }, [entityId]);

  useEffect(() => {
    if (editor?.kind !== "invoice" || editor.mode !== "create") {
      return;
    }

    setInvoiceDraft((current) => {
      const currentEngagement =
        providerEngagements.find(
          (engagement) => engagement.id === current.engagement_id,
        ) ?? null;
      const suggestedInvoiceNumber = buildSuggestedInvoiceNumber(
        currentEngagement,
        snapshot?.invoices ?? [],
      );
      const suggestedDueOn = buildSuggestedDueOn(
        current.issued_on,
        currentEngagement?.invoice_terms_days,
      );
      const nextInvoiceNumber =
        current.invoice_number.trim().length > 0
          ? current.invoice_number
          : suggestedInvoiceNumber;
      const nextDueOn =
        current.due_on.trim().length > 0 ? current.due_on : suggestedDueOn;

      if (
        nextInvoiceNumber === current.invoice_number &&
        nextDueOn === current.due_on
      ) {
        return current;
      }

      return {
        ...current,
        invoice_number: nextInvoiceNumber,
        due_on: nextDueOn,
      };
    });
  }, [editor, providerEngagements, snapshot?.invoices]);

  useEffect(() => {
    if (editor?.kind !== "recurring_task") {
      return;
    }

    let focusTimeout: number | null = null;
    const animationFrame = window.requestAnimationFrame(() => {
      recurringTaskEditorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      focusTimeout = window.setTimeout(() => {
        recurringTaskTitleInputRef.current?.focus({ preventScroll: true });
        recurringTaskTitleInputRef.current?.select();
      }, 250);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (focusTimeout) {
        window.clearTimeout(focusTimeout);
      }
    };
  }, [editor?.id, editor?.kind, editor?.mode]);

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

  const openProfileForm = () => {
    setProfileDraft(buildProfileDraft(profile));
    setEditor({ kind: "profile", mode: profile ? "edit" : "create" });
  };

  const openServiceEngagementCreate = () => {
    setServiceEngagementDraft(buildServiceEngagementDraft(null));
    setContractFile(null);
    setContractFileInputKey((current) => current + 1);
    setEditor({ kind: "service_engagement", mode: "create" });
  };

  const openServiceEngagementEdit = (
    engagement: BusinessBookkeepingSnapshot["serviceEngagements"][number],
  ) => {
    setServiceEngagementDraft(buildServiceEngagementDraft(engagement));
    setContractFile(null);
    setContractFileInputKey((current) => current + 1);
    setEditor({ kind: "service_engagement", mode: "edit", id: engagement.id });
  };

  const openTimeEntryCreate = () => {
    setTimeEntryDraft({
      ...buildTimeEntryDraft(null),
      work_date: toLocalDateKey(new Date()),
    });
    setEditor({ kind: "time_entry", mode: "create" });
  };

  const openTimeEntryEdit = (
    entry: BusinessBookkeepingSnapshot["timeEntries"][number],
  ) => {
    setTimeEntryDraft(buildTimeEntryDraft(entry));
    setEditor({ kind: "time_entry", mode: "edit", id: entry.id });
  };

  const openInvoiceCreate = () => {
    const issuedOn = toLocalDateKey(new Date());
    const defaultEngagement =
      providerEngagements.length === 1 ? providerEngagements[0] : null;

    setInvoiceDraft({
      ...buildInvoiceDraft(null),
      engagement_id: defaultEngagement?.id ?? "",
      invoice_number: buildSuggestedInvoiceNumber(
        defaultEngagement,
        snapshot?.invoices ?? [],
      ),
      issued_on: issuedOn,
      due_on: buildSuggestedDueOn(
        issuedOn,
        defaultEngagement?.invoice_terms_days,
      ),
      status: "draft",
    });
    setEditor({ kind: "invoice", mode: "create" });
  };

  const openInvoiceEdit = (
    invoice: BusinessBookkeepingSnapshot["invoices"][number],
  ) => {
    setInvoiceDraft(buildInvoiceDraft(invoice));
    setEditor({ kind: "invoice", mode: "edit", id: invoice.id });
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

  const openRecurringTaskCreate = () => {
    setRecurringTaskDraft(buildRecurringTaskDraft(null));
    setRecurringTaskDocumentFile(null);
    setRecurringTaskDocumentInputKey((current) => current + 1);
    setEditor({ kind: "recurring_task", mode: "create" });
  };

  const openRecurringTaskEdit = (
    task: BusinessBookkeepingSnapshot["recurringTasks"][number],
  ) => {
    setRecurringTaskDraft(buildRecurringTaskDraft(task));
    setRecurringTaskDocumentFile(null);
    setRecurringTaskDocumentInputKey((current) => current + 1);
    setEditor({ kind: "recurring_task", mode: "edit", id: task.id });
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

  const toggleInvoiceTimeEntry = (timeEntryId: string) => {
    setInvoiceDraft((current) => {
      const exists = current.selected_time_entry_ids.includes(timeEntryId);
      return {
        ...current,
        selected_time_entry_ids: exists
          ? current.selected_time_entry_ids.filter((id) => id !== timeEntryId)
          : [...current.selected_time_entry_ids, timeEntryId],
      };
    });
  };

  const uploadContractDocument = async () => {
    if (!editor?.id || editor.kind !== "service_engagement" || !contractFile) {
      return;
    }

    setContractUploading(true);
    try {
      const formData = new FormData();
      formData.append("engagement_id", editor.id);
      formData.append("file", contractFile);
      if (serviceEngagementDraft.title.trim()) {
        formData.append(
          "title",
          `${serviceEngagementDraft.title.trim()} contract`,
        );
      }

      const res = await fetch(`/api/entities/${entityId}/bookkeeping/contracts`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to upload contract");
      }

      const json = (await res.json()) as BusinessBookkeepingSnapshot;
      setSnapshot(json);
      setContractFile(null);
      setContractFileInputKey((current) => current + 1);
      toast.success("Contract uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload contract");
    } finally {
      setContractUploading(false);
    }
  };

  const uploadRecurringTaskDocument = async () => {
    if (!editingRecurringTask || !recurringTaskDocumentFile) {
      return;
    }

    setRecurringTaskDocumentUploading(true);
    try {
      const formData = new FormData();
      formData.append("task_id", editingRecurringTask.id);
      formData.append("file", recurringTaskDocumentFile);
      if (recurringTaskDraft.title.trim()) {
        formData.append("title", recurringTaskDraft.title.trim());
      }

      const res = await fetch(
        `/api/entities/${entityId}/bookkeeping/recurring-task-documents`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to upload recurring task document");
      }

      const json = (await res.json()) as BusinessBookkeepingSnapshot;
      setSnapshot(json);
      setRecurringTaskDocumentFile(null);
      setRecurringTaskDocumentInputKey((current) => current + 1);
      toast.success("Recurring task document uploaded");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to upload recurring task document",
      );
    } finally {
      setRecurringTaskDocumentUploading(false);
    }
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
      <Section
        title="Business Profile"
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
        ) : profile ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
                <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
                  Legal Name
                </p>
                <p className="mt-2 font-semibold text-text-on-light">
                  {formatText(profile.legal_name)}
                </p>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
                <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
                  DBA / Structure
                </p>
                <p className="mt-2 font-semibold text-text-on-light">
                  {formatText(profile.dba_name)}
                </p>
                <p className="mt-1 text-sm text-brand-secondary-0 opacity-80">
                  {formatText(profile.entity_structure)}
                </p>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
                <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
                  EIN / State
                </p>
                <p className="mt-2 font-semibold text-text-on-light">
                  {formatText(profile.ein)}
                </p>
                <p className="mt-1 text-sm text-brand-secondary-0 opacity-80">
                  {formatText(profile.state_of_formation)}
                </p>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
                <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
                  Basis / Close
                </p>
                <p className="mt-2 font-semibold capitalize text-text-on-light">
                  {formatText(profile.default_accounting_basis)}
                </p>
                <p className="mt-1 text-sm capitalize text-brand-secondary-0 opacity-80">
                  {formatStatus(profile.close_cadence)}
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
                <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
                  Bookkeeping Status
                </p>
                <p className="mt-2 font-semibold capitalize text-text-on-light">
                  {formatStatus(profile.bookkeeping_status)}
                </p>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
                <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
                  Fiscal Year End
                </p>
                <p className="mt-2 font-semibold text-text-on-light">
                  {profile.fiscal_year_end_month && profile.fiscal_year_end_day
                    ? `${profile.fiscal_year_end_month}/${profile.fiscal_year_end_day}`
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
                <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
                  Notes
                </p>
                <p className="mt-2 text-sm text-text-on-light">
                  {formatText(profile.notes)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-brand-secondary-0 opacity-70">
            No business bookkeeping profile has been created yet.
          </p>
        )}
      </Section>

      {showInternalBillingTools ? (
        <>
      <Section title="Billing Overview">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
            <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
              Unbilled Hours
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-on-light">
              {formatHours(billingStats.unbilledHours)}
            </p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
            <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
              Unbilled Amount
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-on-light">
              {formatMoney(billingStats.unbilledAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
            <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
              Draft Invoices
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-on-light">
              {billingStats.draftInvoiceCount}
            </p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
            <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
              Sent Invoices
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-on-light">
              {billingStats.sentInvoiceCount}
            </p>
          </div>
        </div>
      </Section>

      <Section
        title={`Service Engagements (${snapshot.serviceEngagements.length})`}
        actionLabel={
          canCreateProviderEngagement && editor?.kind !== "service_engagement"
            ? "Add Engagement"
            : undefined
        }
        onAction={
          canCreateProviderEngagement ? openServiceEngagementCreate : undefined
        }
      >
        {clientSideEngagements.length > 0 ? (
          <div className="rounded-xl border border-border-subtle bg-surface-inset px-4 py-3 text-sm text-brand-secondary-0">
            Client-side service relationships can be reviewed here, but provider
            billing work such as logging time and issuing invoices happens from the
            provider business page.
          </div>
        ) : null}

        {editor?.kind === "service_engagement" ? (
          <FormCard
            title={
              editor.mode === "edit"
                ? "Edit service engagement"
                : "Add service engagement"
            }
            onCancel={() => setEditor(null)}
            onSave={() =>
              submitMutation(
                "service_engagement",
                editor.mode === "edit"
                  ? { id: editor.id, ...serviceEngagementDraft }
                  : serviceEngagementDraft,
                editor.mode === "edit"
                  ? "Engagement updated"
                  : "Engagement added",
              )
            }
            saving={saving === "service_engagement"}
          >
            <p className="text-sm text-brand-secondary-0 opacity-80">
              This page acts as the service provider. Pick the client business
              tied to this engagement.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <Label label="Title">
                <Input
                  value={serviceEngagementDraft.title}
                  onChange={(event) =>
                    setServiceEngagementDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Service Type">
                <Select
                  value={serviceEngagementDraft.service_type}
                  onChange={(event) =>
                    setServiceEngagementDraft((current) => ({
                      ...current,
                      service_type: event.target.value,
                    }))}
                >
                  {SERVICE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Client Business">
                <Select
                  value={serviceEngagementDraft.client_entity_id}
                  onChange={(event) =>
                    setServiceEngagementDraft((current) => ({
                      ...current,
                      client_entity_id: event.target.value,
                    }))}
                >
                  <option value="">Select client</option>
                  {businessOptions.map((business) => (
                    <option key={business.entity_id} value={business.entity_id}>
                      {business.name}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Billing Model">
                <Select
                  value={serviceEngagementDraft.billing_model}
                  onChange={(event) =>
                    setServiceEngagementDraft((current) => ({
                      ...current,
                      billing_model: event.target.value,
                    }))}
                >
                  {BILLING_MODEL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Default Hourly Rate">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={serviceEngagementDraft.default_hourly_rate}
                  onChange={(event) =>
                    setServiceEngagementDraft((current) => ({
                      ...current,
                      default_hourly_rate: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Currency">
                <Input
                  value={serviceEngagementDraft.currency_code}
                  onChange={(event) =>
                    setServiceEngagementDraft((current) => ({
                      ...current,
                      currency_code: event.target.value.toUpperCase(),
                    }))}
                />
              </Label>
              <Label label="Invoice Terms (Days)">
                <Input
                  type="number"
                  min="0"
                  max="180"
                  value={serviceEngagementDraft.invoice_terms_days}
                  onChange={(event) =>
                    setServiceEngagementDraft((current) => ({
                      ...current,
                      invoice_terms_days: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Invoice Prefix">
                <Input
                  value={serviceEngagementDraft.invoice_prefix}
                  onChange={(event) =>
                    setServiceEngagementDraft((current) => ({
                      ...current,
                      invoice_prefix: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Client Contact">
                <Input
                  value={serviceEngagementDraft.contact_name}
                  onChange={(event) =>
                    setServiceEngagementDraft((current) => ({
                      ...current,
                      contact_name: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Client Contact Email">
                <Input
                  type="email"
                  value={serviceEngagementDraft.contact_email}
                  onChange={(event) =>
                    setServiceEngagementDraft((current) => ({
                      ...current,
                      contact_email: event.target.value,
                    }))}
                />
              </Label>
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-secondary-0">
              <input
                type="checkbox"
                checked={serviceEngagementDraft.is_active}
                onChange={(event) =>
                  setServiceEngagementDraft((current) => ({
                    ...current,
                    is_active: event.target.checked,
                  }))}
              />
              Active engagement
            </label>
            <Label label="Notes">
              <Textarea
                rows={3}
                value={serviceEngagementDraft.notes}
                onChange={(event) =>
                  setServiceEngagementDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))}
              />
            </Label>
            {editor.mode === "edit" ? (
              <div className="space-y-2 rounded-lg border border-border-subtle bg-surface-card p-3">
                <div className="text-sm font-semibold text-text-on-light">
                  Contract Document
                </div>
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <Input
                    key={contractFileInputKey}
                    type="file"
                    accept="application/pdf"
                    onChange={(event) =>
                      setContractFile(event.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => void uploadContractDocument()}
                    disabled={!contractFile || contractUploading}
                    className="rounded-lg border border-border-subtle bg-surface-inset px-4 py-2 text-sm font-semibold text-text-on-light transition hover:bg-surface-page disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {contractUploading ? "Uploading..." : "Upload Contract"}
                  </button>
                </div>
              </div>
            ) : null}
          </FormCard>
        ) : null}

        {snapshot.serviceEngagements.length === 0 ? (
          <p className="text-sm text-brand-secondary-0 opacity-70">
            No billing engagements recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {snapshot.serviceEngagements.map((engagement) => {
              const counterparty = getEngagementCounterparty(engagement);
              const counterpartyHref = counterparty.entityId
                ? entityPath(counterparty.entityId, "bookkeeping")
                : null;

              return (
                <div
                  key={engagement.id}
                  className="rounded-xl border border-border-subtle bg-surface-inset p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text-on-light">
                        {engagement.title}
                      </p>
                      <p className="text-sm capitalize text-brand-secondary-0 opacity-70">
                        {formatStatus(engagement.service_type)} ·{" "}
                        {formatStatus(engagement.billing_model)} ·{" "}
                        {counterpartyHref ? (
                          <>
                            {counterparty.roleLabel}:{" "}
                            <Link
                              href={counterpartyHref}
                              className="font-medium text-text-on-light underline decoration-border-subtle underline-offset-2 transition hover:text-brand-primary-0"
                            >
                              {counterparty.entityLabel}
                            </Link>
                          </>
                        ) : (
                          `${counterparty.roleLabel}: ${counterparty.entityLabel}`
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {canEdit && engagement.current_entity_role === "provider" ? (
                        <button
                          type="button"
                          onClick={() => openServiceEngagementEdit(engagement)}
                          className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-on-light transition hover:bg-surface-page"
                        >
                          Edit
                        </button>
                      ) : null}
                      {counterpartyHref ? (
                        <Link
                          href={counterpartyHref}
                          className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-on-light transition hover:bg-surface-page"
                        >
                          Open {counterparty.roleLabel}
                        </Link>
                      ) : null}
                      <span className="rounded-full bg-surface-nav px-2 py-1 text-xs uppercase tracking-wide text-text-on-dark">
                        {engagement.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                    <p>
                      <span className="opacity-70">Rate:</span>{" "}
                      {formatMoney(
                        engagement.default_hourly_rate,
                        engagement.currency_code,
                      )}
                    </p>
                    <p>
                      <span className="opacity-70">Terms:</span>{" "}
                      {engagement.invoice_terms_days} days
                    </p>
                    <p>
                      <span className="opacity-70">Unbilled:</span>{" "}
                      {formatHours(engagement.unbilled_hours)} /{" "}
                      {formatMoney(
                        engagement.unbilled_amount,
                        engagement.currency_code,
                      )}
                    </p>
                    <p>
                      <span className="opacity-70">Invoiced:</span>{" "}
                      {formatMoney(
                        engagement.invoiced_amount,
                        engagement.currency_code,
                      )}
                    </p>
                    <p>
                      <span className="opacity-70">Contact:</span>{" "}
                      {formatText(engagement.contact_name)}
                    </p>
                    <p>
                      <span className="opacity-70">Invoice Prefix:</span>{" "}
                      {formatText(engagement.invoice_prefix)}
                    </p>
                    <p>
                      <span className="opacity-70">Role:</span>{" "}
                      {toTitle(engagement.current_entity_role)}
                    </p>
                    <p>
                      <span className="opacity-70">Counterparty:</span>{" "}
                      {counterpartyHref ? (
                        <Link
                          href={counterpartyHref}
                          className="font-medium text-text-on-light underline decoration-border-subtle underline-offset-2 transition hover:text-brand-primary-0"
                        >
                          {counterparty.entityLabel}
                        </Link>
                      ) : (
                        counterparty.entityLabel
                      )}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {engagement.contract_document_signed_url ? (
                      <a
                        href={engagement.contract_document_signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-on-light transition hover:bg-surface-page"
                      >
                        Open Contract
                      </a>
                    ) : (
                      <span className="text-xs text-brand-secondary-0 opacity-70">
                        No contract uploaded yet.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section
        title={`Time Entries (${snapshot.timeEntries.length})`}
        actionLabel={
          canEdit &&
            providerEngagements.length > 0 &&
            editor?.kind !== "time_entry"
            ? "Log Time"
            : undefined
        }
        onAction={
          canEdit && providerEngagements.length > 0
            ? openTimeEntryCreate
            : undefined
        }
      >
        {canEdit && providerEngagements.length === 0 && clientSideEngagements.length > 0 ? (
          <div className="rounded-xl border border-border-subtle bg-surface-inset px-4 py-3 text-sm text-brand-secondary-0">
            This page is the client side of the engagement, so new time entries are
            logged from the provider business page.
          </div>
        ) : null}

        {editor?.kind === "time_entry" ? (
          <FormCard
            title={editor.mode === "edit" ? "Edit time entry" : "Log time"}
            onCancel={() => setEditor(null)}
            onSave={() =>
              submitMutation(
                "time_entry",
                editor.mode === "edit"
                  ? { id: editor.id, ...timeEntryDraft }
                  : timeEntryDraft,
                editor.mode === "edit"
                  ? "Time entry updated"
                  : "Time entry added",
              )
            }
            saving={saving === "time_entry"}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Label label="Engagement">
                <Select
                  value={timeEntryDraft.engagement_id}
                  onChange={(event) =>
                    setTimeEntryDraft((current) => ({
                      ...current,
                      engagement_id: event.target.value,
                      invoice_id: "",
                    }))}
                >
                  <option value="">Select engagement</option>
                  {providerEngagements.map((engagement) => (
                    <option key={engagement.id} value={engagement.id}>
                      {engagement.title} · {formatText(engagement.client_entity_name)}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Work Date">
                <Input
                  type="date"
                  value={timeEntryDraft.work_date}
                  onChange={(event) =>
                    setTimeEntryDraft((current) => ({
                      ...current,
                      work_date: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Hours">
                <Input
                  type="number"
                  min="0"
                  max="24"
                  step="0.25"
                  value={timeEntryDraft.hours}
                  onChange={(event) =>
                    setTimeEntryDraft((current) => ({
                      ...current,
                      hours: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Hourly Rate">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={timeEntryDraft.hourly_rate}
                  onChange={(event) =>
                    setTimeEntryDraft((current) => ({
                      ...current,
                      hourly_rate: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Invoice">
                <Select
                  value={timeEntryDraft.invoice_id}
                  onChange={(event) =>
                    setTimeEntryDraft((current) => ({
                      ...current,
                      invoice_id: event.target.value,
                    }))}
                  disabled={!timeEntryDraft.billable}
                >
                  <option value="">Leave unbilled</option>
                  {snapshot.invoices
                    .filter((invoice) =>
                      invoice.current_entity_role === "provider" &&
                      (
                        !timeEntryDraft.engagement_id ||
                        invoice.engagement_id === timeEntryDraft.engagement_id
                      )
                    )
                    .map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} ({toTitle(invoice.status)})
                      </option>
                    ))}
                </Select>
              </Label>
              <Label label="Description">
                <Input
                  value={timeEntryDraft.description}
                  onChange={(event) =>
                    setTimeEntryDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))}
                />
              </Label>
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-secondary-0">
              <input
                type="checkbox"
                checked={timeEntryDraft.billable}
                onChange={(event) =>
                  setTimeEntryDraft((current) => ({
                    ...current,
                    billable: event.target.checked,
                    invoice_id: event.target.checked ? current.invoice_id : "",
                  }))}
              />
              Billable work
            </label>
            <p className="text-sm text-brand-secondary-0 opacity-80">
              Leave hourly rate blank to use the engagement default rate.
            </p>
          </FormCard>
        ) : null}

        {providerEngagements.length === 0 && snapshot.timeEntries.length === 0 ? (
          <p className="text-sm text-brand-secondary-0 opacity-70">
            {clientSideEngagements.length > 0
              ? "No provider-side engagements are available on this page for new time entries."
              : "Add a provider-side engagement before logging time."}
          </p>
        ) : snapshot.timeEntries.length === 0 ? (
          <p className="text-sm text-brand-secondary-0 opacity-70">
            No time entries recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-brand-secondary-0 opacity-70">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Engagement</th>
                  <th className="px-3 py-2">Work</th>
                  <th className="px-3 py-2">Counterparty</th>
                  <th className="px-3 py-2 text-right">Hours</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Invoice</th>
                  {canEdit ? <th className="px-3 py-2 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {snapshot.timeEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-border-subtle">
                    <td className="whitespace-nowrap px-3 py-3 align-top text-text-on-light">
                      {formatDate(entry.work_date)}
                    </td>
                    <td className="px-3 py-3 align-top text-text-on-light">
                      <div className="font-medium">
                        {formatText(entry.engagement_title)}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-text-on-light">
                      <div className="max-w-lg leading-6">
                        {entry.description}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-text-on-light">
                      {formatText(entry.counterparty_name)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right align-top tabular-nums text-text-on-light">
                      {formatHours(entry.hours)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right align-top tabular-nums text-text-on-light">
                      {entry.billable
                        ? formatMoney(entry.effective_hourly_rate)
                        : "Non-billable"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right align-top tabular-nums text-text-on-light">
                      {entry.billable ? formatMoney(entry.amount) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-top text-text-on-light">
                      {entry.invoice_number ?? "Unbilled"}
                    </td>
                    {canEdit ? (
                      <td className="px-3 py-3 text-right align-top">
                        {entry.current_entity_role === "provider" ? (
                          <button
                            type="button"
                            onClick={() => openTimeEntryEdit(entry)}
                            className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-on-light transition hover:bg-surface-page"
                          >
                            Edit
                          </button>
                        ) : (
                          <span className="text-xs text-brand-secondary-0 opacity-60">
                            —
                          </span>
                        )}
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
        title={`Invoices (${snapshot.invoices.length})`}
        actionLabel={
          canEdit &&
            providerEngagements.length > 0 &&
            editor?.kind !== "invoice"
            ? "Create Invoice"
            : undefined
        }
        onAction={
          canEdit && providerEngagements.length > 0
            ? openInvoiceCreate
            : undefined
        }
      >
        {editor?.kind === "invoice" ? (
          <FormCard
            title={editor.mode === "edit" ? "Edit invoice" : "Create invoice"}
            onCancel={() => setEditor(null)}
            onSave={() =>
              submitMutation(
                "invoice",
                editor.mode === "edit"
                  ? { id: editor.id, ...invoiceDraft }
                  : invoiceDraft,
                editor.mode === "edit" ? "Invoice updated" : "Invoice created",
              )
            }
            saving={saving === "invoice"}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Label label="Engagement">
                <Select
                  value={invoiceDraft.engagement_id}
                  onChange={(event) =>
                    setInvoiceDraft((current) => {
                      const previousEngagement =
                        providerEngagements.find(
                          (engagement) => engagement.id === current.engagement_id,
                        ) ?? null;
                      const nextEngagement =
                        providerEngagements.find(
                          (engagement) => engagement.id === event.target.value,
                        ) ?? null;
                      const previousSuggestedInvoiceNumber =
                        buildSuggestedInvoiceNumber(
                          previousEngagement,
                          snapshot?.invoices ?? [],
                        );
                      const previousSuggestedDueOn = buildSuggestedDueOn(
                        current.issued_on,
                        previousEngagement?.invoice_terms_days,
                      );
                      const nextSuggestedInvoiceNumber = buildSuggestedInvoiceNumber(
                        nextEngagement,
                        snapshot?.invoices ?? [],
                      );
                      const nextSuggestedDueOn = buildSuggestedDueOn(
                        current.issued_on,
                        nextEngagement?.invoice_terms_days,
                      );

                      return {
                        ...current,
                        engagement_id: event.target.value,
                        invoice_number:
                          current.invoice_number.trim().length === 0 ||
                          current.invoice_number === previousSuggestedInvoiceNumber
                            ? nextSuggestedInvoiceNumber
                            : current.invoice_number,
                        due_on:
                          current.due_on.trim().length === 0 ||
                          current.due_on === previousSuggestedDueOn
                            ? nextSuggestedDueOn
                            : current.due_on,
                        selected_time_entry_ids: current.selected_time_entry_ids
                          .filter((id) =>
                            (snapshot.timeEntries ?? []).some((entry) =>
                              entry.id === id &&
                              entry.engagement_id === event.target.value
                            )
                          ),
                      };
                    })}
                >
                  <option value="">Select engagement</option>
                  {providerEngagements.map((engagement) => (
                    <option key={engagement.id} value={engagement.id}>
                      {engagement.title} · {formatText(engagement.client_entity_name)}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Invoice Number">
                <Input
                  value={invoiceDraft.invoice_number}
                  placeholder={
                    selectedInvoiceEngagement
                      ? buildSuggestedInvoiceNumber(
                        selectedInvoiceEngagement,
                        snapshot.invoices,
                      )
                      : undefined
                  }
                  onChange={(event) =>
                    setInvoiceDraft((current) => ({
                      ...current,
                      invoice_number: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Issued On">
                <Input
                  type="date"
                  value={invoiceDraft.issued_on}
                  onChange={(event) =>
                    setInvoiceDraft((current) => {
                      const previousSuggestedDueOn = buildSuggestedDueOn(
                        current.issued_on,
                        selectedInvoiceEngagement?.invoice_terms_days,
                      );
                      const nextSuggestedDueOn = buildSuggestedDueOn(
                        event.target.value,
                        selectedInvoiceEngagement?.invoice_terms_days,
                      );

                      return {
                        ...current,
                        issued_on: event.target.value,
                        due_on:
                          current.due_on.trim().length === 0 ||
                          current.due_on === previousSuggestedDueOn
                            ? nextSuggestedDueOn
                            : current.due_on,
                      };
                    })}
                />
              </Label>
              <Label label="Due On">
                <Input
                  type="date"
                  value={invoiceDraft.due_on}
                  placeholder={
                    selectedInvoiceEngagement
                      ? buildSuggestedDueOn(
                        invoiceDraft.issued_on,
                        selectedInvoiceEngagement.invoice_terms_days,
                      )
                      : undefined
                  }
                  onChange={(event) =>
                    setInvoiceDraft((current) => ({
                      ...current,
                      due_on: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Period Start">
                <Input
                  type="date"
                  value={invoiceDraft.period_start}
                  onChange={(event) =>
                    setInvoiceDraft((current) => ({
                      ...current,
                      period_start: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Period End">
                <Input
                  type="date"
                  value={invoiceDraft.period_end}
                  onChange={(event) =>
                    setInvoiceDraft((current) => ({
                      ...current,
                      period_end: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Status">
                <Select
                  value={invoiceDraft.status}
                  onChange={(event) =>
                    setInvoiceDraft((current) => ({
                      ...current,
                      status: event.target.value,
                    }))}
                >
                  {INVOICE_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>
            <p className="text-sm text-brand-secondary-0 opacity-80">
              Invoice number and due date will prefill from the engagement
              prefix and payment terms. You can override either field.
            </p>
            <Label label="Notes">
              <Textarea
                rows={3}
                value={invoiceDraft.notes}
                onChange={(event) =>
                  setInvoiceDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))}
              />
            </Label>
            <div className="space-y-2">
              <div className="text-sm font-semibold text-text-on-light">
                Included Time Entries
              </div>
              {invoiceDraft.engagement_id.length === 0 ? (
                <p className="text-sm text-brand-secondary-0 opacity-70">
                  Pick an engagement to attach unbilled hours.
                </p>
              ) : invoiceAssignableEntries.length === 0 ? (
                <p className="text-sm text-brand-secondary-0 opacity-70">
                  No eligible billable entries found for this engagement.
                </p>
              ) : (
                <div className="space-y-2 rounded-xl border border-border-subtle bg-surface-card p-3">
                  {invoiceAssignableEntries.map((entry) => {
                    const checked = invoiceDraft.selected_time_entry_ids.includes(
                      entry.id,
                    );
                    return (
                      <label
                        key={entry.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-border-subtle bg-surface-inset px-3 py-3 text-sm text-text-on-light"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleInvoiceTimeEntry(entry.id)}
                          className="mt-1"
                        />
                        <span className="min-w-0">
                          <span className="block font-medium">
                            {formatDate(entry.work_date)}
                          </span>
                          <span className="block leading-6 text-brand-secondary-0">
                            {entry.description}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-right tabular-nums text-brand-secondary-0">
                          {formatHours(entry.hours)} · {formatMoney(entry.amount)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </FormCard>
        ) : null}

        {providerEngagements.length === 0 && snapshot.invoices.length === 0 ? (
          <p className="text-sm text-brand-secondary-0 opacity-70">
            Add a provider-side engagement before creating invoices.
          </p>
        ) : snapshot.invoices.length === 0 ? (
          <p className="text-sm text-brand-secondary-0 opacity-70">
            No invoices recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {snapshot.invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="rounded-xl border border-border-subtle bg-surface-inset p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-on-light">
                      {invoice.invoice_number}
                    </p>
                    <p className="text-sm text-brand-secondary-0 opacity-70">
                      {formatText(invoice.engagement_title)} ·{" "}
                      {formatText(invoice.counterparty_name)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit && invoice.current_entity_role === "provider" ? (
                      <button
                        type="button"
                        onClick={() => openInvoiceEdit(invoice)}
                        className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-on-light transition hover:bg-surface-page"
                      >
                        Edit
                      </button>
                    ) : null}
                    <span
                      className={`rounded-full px-2 py-1 text-xs uppercase tracking-wide ${getInvoiceBadgeClass(
                        invoice.status,
                      )}`}
                    >
                      {formatStatus(invoice.status)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <p>
                    <span className="opacity-70">Issued:</span>{" "}
                    {formatDate(invoice.issued_on)}
                  </p>
                  <p>
                    <span className="opacity-70">Due:</span>{" "}
                    {formatDate(invoice.due_on)}
                  </p>
                  <p>
                    <span className="opacity-70">Hours:</span>{" "}
                    {formatHours(invoice.total_hours)}
                  </p>
                  <p>
                    <span className="opacity-70">Amount:</span>{" "}
                    {formatMoney(invoice.total_amount)}
                  </p>
                  <p>
                    <span className="opacity-70">Entries:</span>{" "}
                    {invoice.entry_count}
                  </p>
                  <p>
                    <span className="opacity-70">Period:</span>{" "}
                    {invoice.period_start || invoice.period_end
                      ? `${formatDate(invoice.period_start)} - ${formatDate(
                        invoice.period_end,
                      )}`
                      : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
        </>
      ) : null}

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
        title={`Recurring Tasks (${snapshot.recurringTasks.length})`}
        actionLabel={
          canEdit && editor?.kind !== "recurring_task"
            ? "Add Recurring Task"
            : undefined
        }
        onAction={canEdit ? openRecurringTaskCreate : undefined}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-border-subtle bg-surface-inset p-3">
            <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
              Overdue
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-on-light">
              {recurringTaskStats.overdue}
            </p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-inset p-3">
            <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
              Due Today
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-on-light">
              {recurringTaskStats.dueToday}
            </p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-inset p-3">
            <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
              Due Soon
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-on-light">
              {recurringTaskStats.dueSoon}
            </p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-inset p-3">
            <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
              Current Cycle Done
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-on-light">
              {recurringTaskStats.completed}
            </p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-inset p-3">
            <p className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
              Inactive
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-on-light">
              {recurringTaskStats.inactive}
            </p>
          </div>
        </div>

        {editor?.kind === "recurring_task" ? (
          <div
            ref={recurringTaskEditorRef}
            className="scroll-mt-28 rounded-2xl border border-brand-accent-1/40 bg-surface-card shadow-sm shadow-brand-accent-1/10"
          >
            <FormCard
              title={
                editor.mode === "edit" ? "Edit recurring task" : "Add recurring task"
              }
              onCancel={() => setEditor(null)}
              onSave={() =>
                submitMutation(
                  "recurring_task",
                  editor.mode === "edit"
                    ? { id: editor.id, ...recurringTaskDraft }
                    : recurringTaskDraft,
                  editor.mode === "edit"
                    ? "Recurring task updated"
                    : "Recurring task added",
                )
              }
              saving={saving === "recurring_task"}
            >
              <p className="rounded-lg border border-brand-accent-1/30 bg-brand-accent-1/10 px-3 py-2 text-sm text-text-on-light">
                {editor.mode === "edit"
                  ? "Editing mode is open here. Changes save back to the selected task below."
                  : "Create mode is open here. Add the cadence and first due date to start the schedule."}
              </p>
              <p className="text-sm text-brand-secondary-0 opacity-80">
                Use recurring tasks for bills, vendor payments, quarterly
                distributions, filings, and other operational obligations that keep
                coming back. The anchor date is the first due date in the schedule.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <Label label="Task Title">
                  <Input
                    ref={recurringTaskTitleInputRef}
                    value={recurringTaskDraft.title}
                    onChange={(event) =>
                      setRecurringTaskDraft((current) => ({
                        ...current,
                        title: event.target.value,
                      }))}
                  />
                </Label>
              <Label label="Task Type">
                <Select
                  value={recurringTaskDraft.task_type}
                  onChange={(event) =>
                    setRecurringTaskDraft((current) => ({
                      ...current,
                      task_type: event.target.value,
                    }))}
                >
                  {RECURRING_TASK_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Cadence">
                <Select
                  value={recurringTaskDraft.cadence}
                  onChange={(event) =>
                    setRecurringTaskDraft((current) => ({
                      ...current,
                      cadence: event.target.value,
                    }))}
                >
                  {RECURRING_TASK_CADENCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Every N Cycles">
                <Input
                  type="number"
                  min="1"
                  value={recurringTaskDraft.interval_count}
                  onChange={(event) =>
                    setRecurringTaskDraft((current) => ({
                      ...current,
                      interval_count: event.target.value,
                    }))}
                />
              </Label>
              <Label label="First Due Date">
                <Input
                  type="date"
                  value={recurringTaskDraft.anchor_date}
                  onChange={(event) =>
                    setRecurringTaskDraft((current) => ({
                      ...current,
                      anchor_date: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Responsibility Owner">
                <Select
                  value={recurringTaskDraft.responsibility_id}
                  onChange={(event) =>
                    setRecurringTaskDraft((current) => ({
                      ...current,
                      responsibility_id: event.target.value,
                    }))}
                >
                  <option value="">No linked owner</option>
                  {snapshot.responsibilities.map((responsibility) => (
                    <option key={responsibility.id} value={responsibility.id}>
                      {formatText(
                        responsibility.person_name ??
                          responsibility.user_name ??
                          responsibility.contact_name,
                      )}{" "}
                      · {toTitle(responsibility.responsibility_type)}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Related System">
                <Select
                  value={recurringTaskDraft.system_id}
                  onChange={(event) =>
                    setRecurringTaskDraft((current) => ({
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
                  value={recurringTaskDraft.account_id}
                  onChange={(event) =>
                    setRecurringTaskDraft((current) => ({
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
                  checked={recurringTaskDraft.is_active}
                  onChange={(event) =>
                    setRecurringTaskDraft((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))}
                />
                Active recurring task
              </label>
              <Label label="Description">
                <Textarea
                  rows={3}
                  value={recurringTaskDraft.description}
                  onChange={(event) =>
                    setRecurringTaskDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))}
                />
              </Label>
              <Label label="Notes">
                <Textarea
                  rows={3}
                  value={recurringTaskDraft.notes}
                  onChange={(event) =>
                    setRecurringTaskDraft((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))}
                />
              </Label>
              <div className="rounded-lg border border-border-subtle bg-surface-card px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-on-light">
                      Task Documents
                    </p>
                    <p className="text-sm text-brand-secondary-0 opacity-80">
                      Attach supporting documentation for this recurring task.
                    </p>
                  </div>
                  {editingRecurringTask ? (
                    <span className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-70">
                      {editingRecurringTask.documents.length} attached
                    </span>
                  ) : null}
                </div>

                {editingRecurringTask ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <Input
                        key={recurringTaskDocumentInputKey}
                        type="file"
                        onChange={(event) =>
                          setRecurringTaskDocumentFile(
                            event.target.files?.[0] ?? null,
                          )}
                      />
                      <button
                        type="button"
                        onClick={() => void uploadRecurringTaskDocument()}
                        disabled={
                          !recurringTaskDocumentFile || recurringTaskDocumentUploading
                        }
                        className="rounded-lg bg-brand-primary-0 px-4 py-2 text-sm font-semibold text-brand-primary-1 shadow-sm transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {recurringTaskDocumentUploading
                          ? "Uploading..."
                          : "Upload Document"}
                      </button>
                    </div>

                    {editingRecurringTask.documents.length === 0 ? (
                      <p className="text-sm text-brand-secondary-0 opacity-70">
                        No documents attached yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {editingRecurringTask.documents.map((document) => (
                          <div
                            key={document.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-inset px-3 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-text-on-light">
                                {document.title}
                              </p>
                              <p className="text-xs text-brand-secondary-0 opacity-70">
                                Added {formatDate(document.created_at)}
                              </p>
                            </div>
                            {document.signed_url ? (
                              <a
                                href={document.signed_url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-on-light transition hover:bg-surface-page"
                              >
                                View
                              </a>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-brand-secondary-0 opacity-70">
                    Save the recurring task first, then reopen it to attach
                    documentation.
                  </p>
                )}
              </div>
            </FormCard>
          </div>
        ) : null}

        {recurringTaskViews.length === 0 ? (
          <p className="text-sm text-brand-secondary-0 opacity-70">
            No recurring tasks recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {recurringTaskViews.map((view) => (
              <div
                key={view.task.id}
                className={`rounded-xl border bg-surface-inset p-3 transition ${
                  editor?.kind === "recurring_task" && editor.id === view.task.id
                    ? "border-brand-accent-1 ring-2 ring-brand-accent-1/30"
                    : "border-border-subtle"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-on-light">
                      {view.task.title}
                    </p>
                    <p className="text-sm text-brand-secondary-0 opacity-70">
                      {toTitle(view.task.task_type)} ·{" "}
                      {formatRecurringCadence(
                        view.task.cadence,
                        view.task.interval_count,
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => openRecurringTaskEdit(view.task)}
                        className={`rounded-lg border bg-surface-card px-3 py-1.5 text-xs font-semibold transition hover:bg-surface-page ${
                          editor?.kind === "recurring_task" && editor.id === view.task.id
                            ? "border-brand-accent-1 text-brand-accent-1"
                            : "border-border-subtle text-text-on-light"
                        }`}
                      >
                        {editor?.kind === "recurring_task" && editor.id === view.task.id
                          ? "Editing"
                          : "Edit"}
                      </button>
                    ) : null}
                    {canEdit ? (
                      <button
                        type="button"
                        disabled={
                          saving === "recurring_task_complete" ||
                          !view.activeDueDate ||
                          !view.task.is_active
                        }
                        onClick={() =>
                          void submitMutation(
                            "recurring_task_complete",
                            {
                              id: view.task.id,
                              completed_for_due_date: view.activeDueDate,
                            },
                            "Recurring task marked complete",
                          )}
                        className="rounded-lg bg-surface-accent px-3 py-1.5 text-xs font-semibold text-text-on-dark transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving === "recurring_task_complete"
                          ? "Saving..."
                          : view.status === "completed"
                          ? "Mark Next Cycle"
                          : "Mark Complete"}
                      </button>
                    ) : null}
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide ${getRecurringTaskBadgeClass(
                        view.status,
                      )}`}
                    >
                      {view.statusLabel}
                    </span>
                  </div>
                </div>

                {view.task.description ? (
                  <p className="mt-3 text-sm text-brand-secondary-0 opacity-80">
                    {view.task.description}
                  </p>
                ) : null}

                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-3">
                  <p>
                    <span className="opacity-70">
                      {view.status === "completed" ? "Next Due:" : "Due Date:"}
                    </span>{" "}
                    {formatDate(view.activeDueDate)}
                  </p>
                  <p>
                    <span className="opacity-70">Timing:</span>{" "}
                    {formatRelativeDue(view.daysUntilDue)}
                  </p>
                  <p>
                    <span className="opacity-70">Last Completed:</span>{" "}
                    {formatDate(view.task.last_completed_at)}
                  </p>
                  <p>
                    <span className="opacity-70">Completed For:</span>{" "}
                    {formatDate(view.task.last_completed_for_due_date)}
                  </p>
                  <p>
                    <span className="opacity-70">Owner:</span>{" "}
                    {formatText(view.task.responsibility_name)}
                  </p>
                  <p>
                    <span className="opacity-70">Completed By:</span>{" "}
                    {formatText(view.task.completed_by_name)}
                  </p>
                  <p>
                    <span className="opacity-70">System:</span>{" "}
                    {formatText(view.task.system_name)}
                  </p>
                  <p>
                    <span className="opacity-70">Account:</span>{" "}
                    {formatText(view.task.account_name)}
                  </p>
                  <p>
                    <span className="opacity-70">First Due:</span>{" "}
                    {formatDate(view.task.anchor_date)}
                  </p>
                </div>

                {view.task.notes ? (
                  <p className="mt-3 text-sm text-brand-secondary-0 opacity-80">
                    {view.task.notes}
                  </p>
                ) : null}

                {view.task.documents.length > 0 ? (
                  <div className="mt-3 rounded-lg border border-border-subtle bg-surface-card px-4 py-4">
                    <p className="text-sm font-semibold text-text-on-light">
                      Documents
                    </p>
                    <div className="mt-3 space-y-2">
                      {view.task.documents.map((document) => (
                        <div
                          key={document.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-inset px-3 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-text-on-light">
                              {document.title}
                            </p>
                            <p className="text-xs text-brand-secondary-0 opacity-70">
                              Added {formatDate(document.created_at)}
                            </p>
                          </div>
                          {document.signed_url ? (
                            <a
                              href={document.signed_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-on-light transition hover:bg-surface-page"
                            >
                              View
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
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
