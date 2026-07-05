import type { NextRequest } from "next/server";
import {
  createEntityBookkeepingAccount,
  createEntityBookkeepingClosePeriod,
  createEntityBookkeepingCloseTemplate,
  createEntityBookkeepingResponsibility,
  createEntityBookkeepingSystem,
  getEntityBookkeepingSnapshot,
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

function cleanBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
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
        break;
      case "account":
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
        break;
      case "responsibility":
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
        break;
      case "close_template":
        await createEntityBookkeepingCloseTemplate(entityId, {
          name: cleanRequiredString(payload.name, "Template name"),
          description: cleanOptionalString(payload.description),
          close_frequency:
            cleanOptionalString(payload.close_frequency) ?? "monthly",
          is_active: cleanBoolean(payload.is_active, true),
        });
        break;
      case "close_period":
        await createEntityBookkeepingClosePeriod(entityId, {
          period_start: cleanRequiredString(payload.period_start, "Period start"),
          period_end: cleanRequiredString(payload.period_end, "Period end"),
          period_label: cleanRequiredString(payload.period_label, "Period label"),
          status: cleanOptionalString(payload.status) ?? "open",
          notes: cleanOptionalString(payload.notes),
        });
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
