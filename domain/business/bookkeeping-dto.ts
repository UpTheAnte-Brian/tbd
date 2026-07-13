import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import type { BusinessBookkeepingSnapshot } from "@/domain/business/bookkeeping";
import { createApiClient } from "@/utils/supabase/route";
import { supabaseAdmin } from "@/utils/supabase/service-worker";

export type UpsertBusinessProfileInput = {
  legal_name: string;
  dba_name: string | null;
  ein: string | null;
  state_of_formation: string | null;
  entity_structure: string | null;
  fiscal_year_end_month: number | null;
  fiscal_year_end_day: number | null;
  bookkeeping_status: string;
  close_cadence: string;
  default_accounting_basis: string | null;
  notes: string | null;
};

export type CreateBusinessSystemInput = {
  system_type: string;
  system_name: string;
  vendor_name: string | null;
  external_org_id: string | null;
  environment: string | null;
  is_primary: boolean;
  status: string;
  access_notes: string | null;
};

export type UpdateBusinessSystemInput = CreateBusinessSystemInput & {
  id: string;
};

export type CreateBusinessAccountInput = {
  system_id: string | null;
  account_type: string;
  account_name: string;
  institution_name: string | null;
  external_account_ref: string | null;
  masked_account_number: string | null;
  currency_code: string;
  is_active: boolean;
  is_reconcilable: boolean;
  reconciliation_cadence: string;
  notes: string | null;
};

export type UpdateBusinessAccountInput = CreateBusinessAccountInput & {
  id: string;
};

export type CreateBusinessResponsibilityInput = {
  responsibility_type: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  system_id: string | null;
  account_id: string | null;
  is_primary: boolean;
  notes: string | null;
};

export type UpdateBusinessResponsibilityInput =
  CreateBusinessResponsibilityInput & {
    id: string;
  };

export type CreateBusinessRecurringTaskInput = {
  title: string;
  task_type: string;
  description: string | null;
  cadence: string;
  interval_count: number;
  anchor_date: string;
  responsibility_id: string | null;
  system_id: string | null;
  account_id: string | null;
  is_active: boolean;
  notes: string | null;
};

export type UpdateBusinessRecurringTaskInput =
  CreateBusinessRecurringTaskInput & {
    id: string;
  };

export type CompleteBusinessRecurringTaskInput = {
  id: string;
  completed_for_due_date: string;
};

export type CreateBusinessCloseTemplateInput = {
  name: string;
  description: string | null;
  close_frequency: string;
  is_active: boolean;
};

export type UpdateBusinessCloseTemplateInput =
  CreateBusinessCloseTemplateInput & {
    id: string;
  };

export type CreateBusinessClosePeriodInput = {
  period_start: string;
  period_end: string;
  period_label: string;
  status: string;
  notes: string | null;
};

export type UpdateBusinessClosePeriodInput = CreateBusinessClosePeriodInput & {
  id: string;
};

export type CreateBusinessServiceEngagementInput = {
  title: string;
  client_entity_id: string;
  service_type: string;
  billing_model: string;
  default_hourly_rate: number | null;
  currency_code: string;
  invoice_terms_days: number;
  invoice_prefix: string | null;
  contact_name: string | null;
  contact_email: string | null;
  is_active: boolean;
  notes: string | null;
};

export type UpdateBusinessServiceEngagementInput =
  CreateBusinessServiceEngagementInput & {
    id: string;
  };

export type CreateBusinessTimeEntryInput = {
  engagement_id: string;
  work_date: string;
  hours: number;
  hourly_rate: number | null;
  description: string;
  billable: boolean;
  invoice_id: string | null;
};

export type UpdateBusinessTimeEntryInput = CreateBusinessTimeEntryInput & {
  id: string;
};

export type CreateBusinessInvoiceInput = {
  engagement_id: string;
  invoice_number: string;
  period_start: string | null;
  period_end: string | null;
  issued_on: string;
  due_on: string | null;
  status: string;
  notes: string | null;
  time_entry_ids: string[];
};

export type UpdateBusinessInvoiceInput = CreateBusinessInvoiceInput & {
  id: string;
};

async function getBookkeepingClient(): Promise<SupabaseClient<Database>> {
  return createApiClient();
}

const EMPTY_SNAPSHOT: BusinessBookkeepingSnapshot = {
  profile: null,
  serviceEngagements: [],
  timeEntries: [],
  invoices: [],
  systems: [],
  accounts: [],
  responsibilities: [],
  recurringTasks: [],
  closeTemplates: [],
  closePeriods: [],
};

async function runBookkeepingRpc(
  fn: string,
  params: Record<string, unknown>,
) {
  const supabase = await getBookkeepingClient();
  const { data, error } = await supabase.rpc(fn as never, params as never);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getEntityBookkeepingSnapshot(
  entityId: string,
): Promise<BusinessBookkeepingSnapshot> {
  const data = await runBookkeepingRpc("get_entity_bookkeeping_snapshot", {
    p_entity_id: entityId,
  });

  if (!data || typeof data !== "object") {
    return EMPTY_SNAPSHOT;
  }

  const snapshot = {
    ...EMPTY_SNAPSHOT,
    ...(data as Partial<BusinessBookkeepingSnapshot>),
  };

  snapshot.serviceEngagements = await Promise.all(
    snapshot.serviceEngagements.map(async (engagement) => {
      const raw = engagement as typeof engagement & {
        contract_document_storage_bucket?: string | null;
        contract_document_storage_path?: string | null;
      };

      let contractDocumentSignedUrl: string | null = null;
      if (
        raw.contract_document_storage_bucket &&
        raw.contract_document_storage_path
      ) {
        const { data: signedData, error } = await supabaseAdmin
          .storage
          .from(raw.contract_document_storage_bucket)
          .createSignedUrl(raw.contract_document_storage_path, 60 * 60);

        if (!error) {
          contractDocumentSignedUrl = signedData?.signedUrl ?? null;
        }
      }

      return {
        ...engagement,
        contract_document_signed_url: contractDocumentSignedUrl,
      };
    }),
  );

  return snapshot;
}

export async function upsertEntityBookkeepingProfile(
  entityId: string,
  input: UpsertBusinessProfileInput,
) {
  await runBookkeepingRpc("upsert_entity_bookkeeping_profile", {
    p_entity_id: entityId,
    p_legal_name: input.legal_name,
    p_dba_name: input.dba_name,
    p_ein: input.ein,
    p_state_of_formation: input.state_of_formation,
    p_entity_structure: input.entity_structure,
    p_fiscal_year_end_month: input.fiscal_year_end_month,
    p_fiscal_year_end_day: input.fiscal_year_end_day,
    p_bookkeeping_status: input.bookkeeping_status,
    p_close_cadence: input.close_cadence,
    p_default_accounting_basis: input.default_accounting_basis,
    p_notes: input.notes,
  });
}

export async function createEntityBookkeepingSystem(
  entityId: string,
  input: CreateBusinessSystemInput,
) {
  await runBookkeepingRpc("create_entity_bookkeeping_system", {
    p_entity_id: entityId,
    p_system_type: input.system_type,
    p_system_name: input.system_name,
    p_vendor_name: input.vendor_name,
    p_external_org_id: input.external_org_id,
    p_environment: input.environment,
    p_is_primary: input.is_primary,
    p_status: input.status,
    p_access_notes: input.access_notes,
  });
}

export async function updateEntityBookkeepingSystem(
  entityId: string,
  input: UpdateBusinessSystemInput,
) {
  await runBookkeepingRpc("update_entity_bookkeeping_system", {
    p_entity_id: entityId,
    p_system_id: input.id,
    p_system_type: input.system_type,
    p_system_name: input.system_name,
    p_vendor_name: input.vendor_name,
    p_external_org_id: input.external_org_id,
    p_environment: input.environment,
    p_is_primary: input.is_primary,
    p_status: input.status,
    p_access_notes: input.access_notes,
  });
}

export async function createEntityBookkeepingAccount(
  entityId: string,
  input: CreateBusinessAccountInput,
) {
  await runBookkeepingRpc("create_entity_bookkeeping_account", {
    p_entity_id: entityId,
    p_system_id: input.system_id,
    p_account_type: input.account_type,
    p_account_name: input.account_name,
    p_institution_name: input.institution_name,
    p_external_account_ref: input.external_account_ref,
    p_masked_account_number: input.masked_account_number,
    p_currency_code: input.currency_code,
    p_is_active: input.is_active,
    p_is_reconcilable: input.is_reconcilable,
    p_reconciliation_cadence: input.reconciliation_cadence,
    p_notes: input.notes,
  });
}

export async function updateEntityBookkeepingAccount(
  entityId: string,
  input: UpdateBusinessAccountInput,
) {
  await runBookkeepingRpc("update_entity_bookkeeping_account", {
    p_entity_id: entityId,
    p_account_id: input.id,
    p_system_id: input.system_id,
    p_account_type: input.account_type,
    p_account_name: input.account_name,
    p_institution_name: input.institution_name,
    p_external_account_ref: input.external_account_ref,
    p_masked_account_number: input.masked_account_number,
    p_currency_code: input.currency_code,
    p_is_active: input.is_active,
    p_is_reconcilable: input.is_reconcilable,
    p_reconciliation_cadence: input.reconciliation_cadence,
    p_notes: input.notes,
  });
}

export async function createEntityBookkeepingResponsibility(
  entityId: string,
  input: CreateBusinessResponsibilityInput,
) {
  await runBookkeepingRpc("create_entity_bookkeeping_responsibility", {
    p_entity_id: entityId,
    p_responsibility_type: input.responsibility_type,
    p_contact_name: input.contact_name,
    p_contact_email: input.contact_email,
    p_contact_phone: input.contact_phone,
    p_system_id: input.system_id,
    p_account_id: input.account_id,
    p_is_primary: input.is_primary,
    p_notes: input.notes,
  });
}

export async function updateEntityBookkeepingResponsibility(
  entityId: string,
  input: UpdateBusinessResponsibilityInput,
) {
  await runBookkeepingRpc("update_entity_bookkeeping_responsibility", {
    p_entity_id: entityId,
    p_responsibility_id: input.id,
    p_responsibility_type: input.responsibility_type,
    p_contact_name: input.contact_name,
    p_contact_email: input.contact_email,
    p_contact_phone: input.contact_phone,
    p_system_id: input.system_id,
    p_account_id: input.account_id,
    p_is_primary: input.is_primary,
    p_notes: input.notes,
  });
}

export async function createEntityBookkeepingRecurringTask(
  entityId: string,
  input: CreateBusinessRecurringTaskInput,
) {
  await runBookkeepingRpc("create_entity_bookkeeping_recurring_task", {
    p_entity_id: entityId,
    p_title: input.title,
    p_task_type: input.task_type,
    p_description: input.description,
    p_cadence: input.cadence,
    p_interval_count: input.interval_count,
    p_anchor_date: input.anchor_date,
    p_responsibility_id: input.responsibility_id,
    p_system_id: input.system_id,
    p_account_id: input.account_id,
    p_is_active: input.is_active,
    p_notes: input.notes,
  });
}

export async function updateEntityBookkeepingRecurringTask(
  entityId: string,
  input: UpdateBusinessRecurringTaskInput,
) {
  await runBookkeepingRpc("update_entity_bookkeeping_recurring_task", {
    p_entity_id: entityId,
    p_task_id: input.id,
    p_title: input.title,
    p_task_type: input.task_type,
    p_description: input.description,
    p_cadence: input.cadence,
    p_interval_count: input.interval_count,
    p_anchor_date: input.anchor_date,
    p_responsibility_id: input.responsibility_id,
    p_system_id: input.system_id,
    p_account_id: input.account_id,
    p_is_active: input.is_active,
    p_notes: input.notes,
  });
}

export async function completeEntityBookkeepingRecurringTask(
  entityId: string,
  input: CompleteBusinessRecurringTaskInput,
) {
  await runBookkeepingRpc("complete_entity_bookkeeping_recurring_task", {
    p_entity_id: entityId,
    p_task_id: input.id,
    p_completed_for_due_date: input.completed_for_due_date,
  });
}

export async function createEntityBookkeepingCloseTemplate(
  entityId: string,
  input: CreateBusinessCloseTemplateInput,
) {
  await runBookkeepingRpc("create_entity_bookkeeping_close_template", {
    p_entity_id: entityId,
    p_name: input.name,
    p_description: input.description,
    p_close_frequency: input.close_frequency,
    p_is_active: input.is_active,
  });
}

export async function updateEntityBookkeepingCloseTemplate(
  entityId: string,
  input: UpdateBusinessCloseTemplateInput,
) {
  await runBookkeepingRpc("update_entity_bookkeeping_close_template", {
    p_entity_id: entityId,
    p_template_id: input.id,
    p_name: input.name,
    p_description: input.description,
    p_close_frequency: input.close_frequency,
    p_is_active: input.is_active,
  });
}

export async function createEntityBookkeepingClosePeriod(
  entityId: string,
  input: CreateBusinessClosePeriodInput,
) {
  await runBookkeepingRpc("create_entity_bookkeeping_close_period", {
    p_entity_id: entityId,
    p_period_start: input.period_start,
    p_period_end: input.period_end,
    p_period_label: input.period_label,
    p_status: input.status,
    p_notes: input.notes,
  });
}

export async function updateEntityBookkeepingClosePeriod(
  entityId: string,
  input: UpdateBusinessClosePeriodInput,
) {
  await runBookkeepingRpc("update_entity_bookkeeping_close_period", {
    p_entity_id: entityId,
    p_close_period_id: input.id,
    p_period_start: input.period_start,
    p_period_end: input.period_end,
    p_period_label: input.period_label,
    p_status: input.status,
    p_notes: input.notes,
  });
}

export async function createEntityBookkeepingServiceEngagement(
  entityId: string,
  input: CreateBusinessServiceEngagementInput,
) {
  await runBookkeepingRpc("create_entity_bookkeeping_service_engagement", {
    p_entity_id: entityId,
    p_title: input.title,
    p_client_entity_id: input.client_entity_id,
    p_service_type: input.service_type,
    p_billing_model: input.billing_model,
    p_default_hourly_rate: input.default_hourly_rate,
    p_currency_code: input.currency_code,
    p_invoice_terms_days: input.invoice_terms_days,
    p_invoice_prefix: input.invoice_prefix,
    p_contact_name: input.contact_name,
    p_contact_email: input.contact_email,
    p_is_active: input.is_active,
    p_notes: input.notes,
  });
}

export async function updateEntityBookkeepingServiceEngagement(
  entityId: string,
  input: UpdateBusinessServiceEngagementInput,
) {
  await runBookkeepingRpc("update_entity_bookkeeping_service_engagement", {
    p_entity_id: entityId,
    p_engagement_id: input.id,
    p_title: input.title,
    p_client_entity_id: input.client_entity_id,
    p_service_type: input.service_type,
    p_billing_model: input.billing_model,
    p_default_hourly_rate: input.default_hourly_rate,
    p_currency_code: input.currency_code,
    p_invoice_terms_days: input.invoice_terms_days,
    p_invoice_prefix: input.invoice_prefix,
    p_contact_name: input.contact_name,
    p_contact_email: input.contact_email,
    p_is_active: input.is_active,
    p_notes: input.notes,
  });
}

export async function attachEntityBookkeepingContractDocument(
  entityId: string,
  engagementId: string,
  documentId: string,
) {
  await runBookkeepingRpc("attach_entity_bookkeeping_contract_document", {
    p_entity_id: entityId,
    p_engagement_id: engagementId,
    p_document_id: documentId,
  });
}

export async function createEntityBookkeepingTimeEntry(
  entityId: string,
  input: CreateBusinessTimeEntryInput,
) {
  await runBookkeepingRpc("create_entity_bookkeeping_time_entry", {
    p_entity_id: entityId,
    p_engagement_id: input.engagement_id,
    p_work_date: input.work_date,
    p_hours: input.hours,
    p_hourly_rate: input.hourly_rate,
    p_description: input.description,
    p_billable: input.billable,
    p_invoice_id: input.invoice_id,
  });
}

export async function updateEntityBookkeepingTimeEntry(
  entityId: string,
  input: UpdateBusinessTimeEntryInput,
) {
  await runBookkeepingRpc("update_entity_bookkeeping_time_entry", {
    p_entity_id: entityId,
    p_time_entry_id: input.id,
    p_engagement_id: input.engagement_id,
    p_work_date: input.work_date,
    p_hours: input.hours,
    p_hourly_rate: input.hourly_rate,
    p_description: input.description,
    p_billable: input.billable,
    p_invoice_id: input.invoice_id,
  });
}

export async function createEntityBookkeepingInvoice(
  entityId: string,
  input: CreateBusinessInvoiceInput,
) {
  await runBookkeepingRpc("create_entity_bookkeeping_invoice", {
    p_entity_id: entityId,
    p_engagement_id: input.engagement_id,
    p_invoice_number: input.invoice_number,
    p_period_start: input.period_start,
    p_period_end: input.period_end,
    p_issued_on: input.issued_on,
    p_due_on: input.due_on,
    p_status: input.status,
    p_notes: input.notes,
    p_time_entry_ids: input.time_entry_ids,
  });
}

export async function updateEntityBookkeepingInvoice(
  entityId: string,
  input: UpdateBusinessInvoiceInput,
) {
  await runBookkeepingRpc("update_entity_bookkeeping_invoice", {
    p_entity_id: entityId,
    p_invoice_id: input.id,
    p_engagement_id: input.engagement_id,
    p_invoice_number: input.invoice_number,
    p_period_start: input.period_start,
    p_period_end: input.period_end,
    p_issued_on: input.issued_on,
    p_due_on: input.due_on,
    p_status: input.status,
    p_notes: input.notes,
    p_time_entry_ids: input.time_entry_ids,
  });
}
