import type { NextRequest } from "next/server";
import {
  createEntityBookkeepingInvoice,
  completeEntityBookkeepingRecurringTask,
  createEntityBookkeepingAccount,
  createEntityBookkeepingClosePeriod,
  createEntityBookkeepingCloseTemplate,
  createEntityBookkeepingRecurringTask,
  createEntityBookkeepingResponsibility,
  createEntityBookkeepingServiceEngagement,
  createEntityBookkeepingSystem,
  createEntityBookkeepingTimeEntry,
  getEntityBookkeepingSnapshot,
  updateEntityBookkeepingInvoice,
  updateEntityBookkeepingAccount,
  updateEntityBookkeepingClosePeriod,
  updateEntityBookkeepingCloseTemplate,
  updateEntityBookkeepingRecurringTask,
  updateEntityBookkeepingResponsibility,
  updateEntityBookkeepingServiceEngagement,
  updateEntityBookkeepingSystem,
  updateEntityBookkeepingTimeEntry,
  upsertEntityBookkeepingProfile,
} from "@/domain/business/bookkeeping-dto";
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
  requireEntityUser,
} from "@/app/lib/server/rbac";

function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanRequiredString(value: unknown, label: string): string {
  const cleaned = cleanOptionalString(value);
  if (!cleaned) {
    throw new Error(`${label} is required`);
  }
  return cleaned;
}

function cleanOptionalInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) return parsed;
  }
  return null;
}

function cleanPositiveInteger(
  value: unknown,
  label: string,
  fallback = 1,
): number {
  const parsed = cleanOptionalInteger(value);
  if (parsed === null) return fallback;
  if (parsed < 1) {
    throw new Error(`${label} must be at least 1`);
  }
  return parsed;
}

function cleanIntegerInRange(
  value: unknown,
  label: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = cleanOptionalInteger(value);
  if (parsed === null) return fallback;
  if (parsed < min || parsed > max) {
    throw new Error(`${label} must be between ${min} and ${max}`);
  }
  return parsed;
}

function cleanOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function cleanRequiredNumber(value: unknown, label: string): number {
  const parsed = cleanOptionalNumber(value);
  if (parsed === null) {
    throw new Error(`${label} is required`);
  }
  return parsed;
}

function cleanBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanOptionalString(item))
    .filter((item): item is string => Boolean(item));
}

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
      : lower.includes("required") || lower.includes("invalid")
      ? 400
      : 500;
    return jsonError(message, status);
  }
}

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

    const body = (await req.json().catch(() => null)) as
      | { kind?: unknown; payload?: Record<string, unknown> }
      | null;
    if (!body || typeof body !== "object") {
      throw new Error("Invalid request body");
    }

    const kind = typeof body.kind === "string" ? body.kind : "";
    const payload =
      body.payload && typeof body.payload === "object" ? body.payload : {};
    const recordId = cleanOptionalString(payload.id);

    switch (kind) {
      case "profile":
        await upsertEntityBookkeepingProfile(entityId, {
          legal_name: cleanRequiredString(payload.legal_name, "Legal name"),
          dba_name: cleanOptionalString(payload.dba_name),
          ein: cleanOptionalString(payload.ein),
          state_of_formation: cleanOptionalString(payload.state_of_formation),
          entity_structure: cleanOptionalString(payload.entity_structure),
          fiscal_year_end_month: cleanOptionalInteger(
            payload.fiscal_year_end_month,
          ),
          fiscal_year_end_day: cleanOptionalInteger(payload.fiscal_year_end_day),
          bookkeeping_status:
            cleanOptionalString(payload.bookkeeping_status) ?? "active",
          close_cadence: cleanOptionalString(payload.close_cadence) ?? "monthly",
          default_accounting_basis: cleanOptionalString(
            payload.default_accounting_basis,
          ),
          notes: cleanOptionalString(payload.notes),
        });
        break;
      case "system":
        if (recordId) {
          await updateEntityBookkeepingSystem(entityId, {
            id: recordId,
            system_type: cleanRequiredString(payload.system_type, "System type"),
            system_name: cleanRequiredString(payload.system_name, "System name"),
            vendor_name: cleanOptionalString(payload.vendor_name),
            external_org_id: cleanOptionalString(payload.external_org_id),
            environment: cleanOptionalString(payload.environment),
            is_primary: cleanBoolean(payload.is_primary),
            status: cleanOptionalString(payload.status) ?? "active",
            access_notes: cleanOptionalString(payload.access_notes),
          });
        } else {
          await createEntityBookkeepingSystem(entityId, {
            system_type: cleanRequiredString(payload.system_type, "System type"),
            system_name: cleanRequiredString(payload.system_name, "System name"),
            vendor_name: cleanOptionalString(payload.vendor_name),
            external_org_id: cleanOptionalString(payload.external_org_id),
            environment: cleanOptionalString(payload.environment),
            is_primary: cleanBoolean(payload.is_primary),
            status: cleanOptionalString(payload.status) ?? "active",
            access_notes: cleanOptionalString(payload.access_notes),
          });
        }
        break;
      case "service_engagement":
        if (recordId) {
          await updateEntityBookkeepingServiceEngagement(entityId, {
            id: recordId,
            title: cleanRequiredString(payload.title, "Engagement title"),
            client_entity_id: cleanRequiredString(
              payload.client_entity_id,
              "Client entity",
            ),
            service_type: cleanOptionalString(payload.service_type) ?? "bookkeeping",
            billing_model: cleanOptionalString(payload.billing_model) ?? "hourly",
            default_hourly_rate: cleanOptionalNumber(
              payload.default_hourly_rate,
            ),
            currency_code: cleanOptionalString(payload.currency_code) ?? "USD",
            invoice_terms_days: cleanIntegerInRange(
              payload.invoice_terms_days,
              "Invoice terms",
              30,
              0,
              180,
            ),
            invoice_prefix: cleanOptionalString(payload.invoice_prefix),
            contact_name: cleanOptionalString(payload.contact_name),
            contact_email: cleanOptionalString(payload.contact_email),
            is_active: cleanBoolean(payload.is_active, true),
            notes: cleanOptionalString(payload.notes),
          });
        } else {
          await createEntityBookkeepingServiceEngagement(entityId, {
            title: cleanRequiredString(payload.title, "Engagement title"),
            client_entity_id: cleanRequiredString(
              payload.client_entity_id,
              "Client entity",
            ),
            service_type: cleanOptionalString(payload.service_type) ?? "bookkeeping",
            billing_model: cleanOptionalString(payload.billing_model) ?? "hourly",
            default_hourly_rate: cleanOptionalNumber(
              payload.default_hourly_rate,
            ),
            currency_code: cleanOptionalString(payload.currency_code) ?? "USD",
            invoice_terms_days: cleanIntegerInRange(
              payload.invoice_terms_days,
              "Invoice terms",
              30,
              0,
              180,
            ),
            invoice_prefix: cleanOptionalString(payload.invoice_prefix),
            contact_name: cleanOptionalString(payload.contact_name),
            contact_email: cleanOptionalString(payload.contact_email),
            is_active: cleanBoolean(payload.is_active, true),
            notes: cleanOptionalString(payload.notes),
          });
        }
        break;
      case "time_entry":
        if (recordId) {
          await updateEntityBookkeepingTimeEntry(entityId, {
            id: recordId,
            engagement_id: cleanRequiredString(
              payload.engagement_id,
              "Service engagement",
            ),
            work_date: cleanRequiredString(payload.work_date, "Work date"),
            hours: cleanRequiredNumber(payload.hours, "Hours"),
            hourly_rate: cleanOptionalNumber(payload.hourly_rate),
            description: cleanRequiredString(payload.description, "Description"),
            billable: cleanBoolean(payload.billable, true),
            invoice_id: cleanOptionalString(payload.invoice_id),
          });
        } else {
          await createEntityBookkeepingTimeEntry(entityId, {
            engagement_id: cleanRequiredString(
              payload.engagement_id,
              "Service engagement",
            ),
            work_date: cleanRequiredString(payload.work_date, "Work date"),
            hours: cleanRequiredNumber(payload.hours, "Hours"),
            hourly_rate: cleanOptionalNumber(payload.hourly_rate),
            description: cleanRequiredString(payload.description, "Description"),
            billable: cleanBoolean(payload.billable, true),
            invoice_id: cleanOptionalString(payload.invoice_id),
          });
        }
        break;
      case "invoice":
        if (recordId) {
          await updateEntityBookkeepingInvoice(entityId, {
            id: recordId,
            engagement_id: cleanRequiredString(
              payload.engagement_id,
              "Service engagement",
            ),
            invoice_number: cleanRequiredString(
              payload.invoice_number,
              "Invoice number",
            ),
            period_start: cleanOptionalString(payload.period_start),
            period_end: cleanOptionalString(payload.period_end),
            issued_on: cleanRequiredString(payload.issued_on, "Issued on"),
            due_on: cleanOptionalString(payload.due_on),
            status: cleanOptionalString(payload.status) ?? "draft",
            notes: cleanOptionalString(payload.notes),
            time_entry_ids: cleanStringArray(payload.time_entry_ids),
          });
        } else {
          await createEntityBookkeepingInvoice(entityId, {
            engagement_id: cleanRequiredString(
              payload.engagement_id,
              "Service engagement",
            ),
            invoice_number: cleanRequiredString(
              payload.invoice_number,
              "Invoice number",
            ),
            period_start: cleanOptionalString(payload.period_start),
            period_end: cleanOptionalString(payload.period_end),
            issued_on: cleanRequiredString(payload.issued_on, "Issued on"),
            due_on: cleanOptionalString(payload.due_on),
            status: cleanOptionalString(payload.status) ?? "draft",
            notes: cleanOptionalString(payload.notes),
            time_entry_ids: cleanStringArray(payload.time_entry_ids),
          });
        }
        break;
      case "account":
        if (recordId) {
          await updateEntityBookkeepingAccount(entityId, {
            id: recordId,
            system_id: cleanOptionalString(payload.system_id),
            account_type: cleanRequiredString(payload.account_type, "Account type"),
            account_name: cleanRequiredString(payload.account_name, "Account name"),
            institution_name: cleanOptionalString(payload.institution_name),
            external_account_ref: cleanOptionalString(payload.external_account_ref),
            masked_account_number: cleanOptionalString(
              payload.masked_account_number,
            ),
            currency_code: cleanOptionalString(payload.currency_code) ?? "USD",
            is_active: cleanBoolean(payload.is_active, true),
            is_reconcilable: cleanBoolean(payload.is_reconcilable, true),
            reconciliation_cadence:
              cleanOptionalString(payload.reconciliation_cadence) ?? "monthly",
            notes: cleanOptionalString(payload.notes),
          });
        } else {
          await createEntityBookkeepingAccount(entityId, {
            system_id: cleanOptionalString(payload.system_id),
            account_type: cleanRequiredString(payload.account_type, "Account type"),
            account_name: cleanRequiredString(payload.account_name, "Account name"),
            institution_name: cleanOptionalString(payload.institution_name),
            external_account_ref: cleanOptionalString(payload.external_account_ref),
            masked_account_number: cleanOptionalString(
              payload.masked_account_number,
            ),
            currency_code: cleanOptionalString(payload.currency_code) ?? "USD",
            is_active: cleanBoolean(payload.is_active, true),
            is_reconcilable: cleanBoolean(payload.is_reconcilable, true),
            reconciliation_cadence:
              cleanOptionalString(payload.reconciliation_cadence) ?? "monthly",
            notes: cleanOptionalString(payload.notes),
          });
        }
        break;
      case "responsibility":
        if (recordId) {
          await updateEntityBookkeepingResponsibility(entityId, {
            id: recordId,
            responsibility_type: cleanRequiredString(
              payload.responsibility_type,
              "Responsibility type",
            ),
            contact_name: cleanOptionalString(payload.contact_name),
            contact_email: cleanOptionalString(payload.contact_email),
            contact_phone: cleanOptionalString(payload.contact_phone),
            system_id: cleanOptionalString(payload.system_id),
            account_id: cleanOptionalString(payload.account_id),
            is_primary: cleanBoolean(payload.is_primary, true),
            notes: cleanOptionalString(payload.notes),
          });
        } else {
          await createEntityBookkeepingResponsibility(entityId, {
            responsibility_type: cleanRequiredString(
              payload.responsibility_type,
              "Responsibility type",
            ),
            contact_name: cleanOptionalString(payload.contact_name),
            contact_email: cleanOptionalString(payload.contact_email),
            contact_phone: cleanOptionalString(payload.contact_phone),
            system_id: cleanOptionalString(payload.system_id),
            account_id: cleanOptionalString(payload.account_id),
            is_primary: cleanBoolean(payload.is_primary, true),
            notes: cleanOptionalString(payload.notes),
          });
        }
        break;
      case "recurring_task":
        if (recordId) {
          await updateEntityBookkeepingRecurringTask(entityId, {
            id: recordId,
            title: cleanRequiredString(payload.title, "Task title"),
            task_type: cleanOptionalString(payload.task_type) ?? "bill_payment",
            description: cleanOptionalString(payload.description),
            cadence: cleanOptionalString(payload.cadence) ?? "monthly",
            interval_count: cleanPositiveInteger(
              payload.interval_count,
              "Interval count",
            ),
            anchor_date: cleanRequiredString(payload.anchor_date, "Anchor date"),
            responsibility_id: cleanOptionalString(payload.responsibility_id),
            system_id: cleanOptionalString(payload.system_id),
            account_id: cleanOptionalString(payload.account_id),
            is_active: cleanBoolean(payload.is_active, true),
            notes: cleanOptionalString(payload.notes),
          });
        } else {
          await createEntityBookkeepingRecurringTask(entityId, {
            title: cleanRequiredString(payload.title, "Task title"),
            task_type: cleanOptionalString(payload.task_type) ?? "bill_payment",
            description: cleanOptionalString(payload.description),
            cadence: cleanOptionalString(payload.cadence) ?? "monthly",
            interval_count: cleanPositiveInteger(
              payload.interval_count,
              "Interval count",
            ),
            anchor_date: cleanRequiredString(payload.anchor_date, "Anchor date"),
            responsibility_id: cleanOptionalString(payload.responsibility_id),
            system_id: cleanOptionalString(payload.system_id),
            account_id: cleanOptionalString(payload.account_id),
            is_active: cleanBoolean(payload.is_active, true),
            notes: cleanOptionalString(payload.notes),
          });
        }
        break;
      case "recurring_task_complete":
        if (!recordId) {
          throw new Error("Recurring task id is required");
        }
        await completeEntityBookkeepingRecurringTask(entityId, {
          id: recordId,
          completed_for_due_date: cleanRequiredString(
            payload.completed_for_due_date,
            "Completed due date",
          ),
        });
        break;
      case "close_template":
        if (recordId) {
          await updateEntityBookkeepingCloseTemplate(entityId, {
            id: recordId,
            name: cleanRequiredString(payload.name, "Template name"),
            description: cleanOptionalString(payload.description),
            close_frequency:
              cleanOptionalString(payload.close_frequency) ?? "monthly",
            is_active: cleanBoolean(payload.is_active, true),
          });
        } else {
          await createEntityBookkeepingCloseTemplate(entityId, {
            name: cleanRequiredString(payload.name, "Template name"),
            description: cleanOptionalString(payload.description),
            close_frequency:
              cleanOptionalString(payload.close_frequency) ?? "monthly",
            is_active: cleanBoolean(payload.is_active, true),
          });
        }
        break;
      case "close_period":
        if (recordId) {
          await updateEntityBookkeepingClosePeriod(entityId, {
            id: recordId,
            period_start: cleanRequiredString(payload.period_start, "Period start"),
            period_end: cleanRequiredString(payload.period_end, "Period end"),
            period_label: cleanRequiredString(payload.period_label, "Period label"),
            status: cleanOptionalString(payload.status) ?? "open",
            notes: cleanOptionalString(payload.notes),
          });
        } else {
          await createEntityBookkeepingClosePeriod(entityId, {
            period_start: cleanRequiredString(payload.period_start, "Period start"),
            period_end: cleanRequiredString(payload.period_end, "Period end"),
            period_label: cleanRequiredString(payload.period_label, "Period label"),
            status: cleanOptionalString(payload.status) ?? "open",
            notes: cleanOptionalString(payload.notes),
          });
        }
        break;
      default:
        throw new Error("Invalid bookkeeping mutation");
    }

    const snapshot = await getEntityBookkeepingSnapshot(entityId);
    return jsonOk(snapshot);
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to update bookkeeping";
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
