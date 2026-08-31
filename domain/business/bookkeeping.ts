import type { Database } from "@/database.types";

type BusinessTables = Database["business"]["Tables"];

export type BusinessProfile =
  BusinessTables["business_profiles"]["Row"];

export type BusinessProfileSummary = BusinessProfile & {
  business_address: string | null;
};

export type BusinessSystem =
  BusinessTables["business_systems"]["Row"];

export type BusinessFinancialAccount =
  BusinessTables["business_financial_accounts"]["Row"];

export type BusinessResponsibility =
  BusinessTables["business_responsibilities"]["Row"];

export type BusinessRecurringTask =
  BusinessTables["business_recurring_tasks"]["Row"];

export type BusinessServiceEngagement =
  BusinessTables["business_service_engagements"]["Row"];

export type BusinessTimeEntry =
  BusinessTables["business_time_entries"]["Row"];

export type BusinessInvoice =
  BusinessTables["business_invoices"]["Row"];

export type BusinessCloseTemplate =
  BusinessTables["business_close_templates"]["Row"];

export type BusinessCloseTemplateTask =
  BusinessTables["business_close_template_tasks"]["Row"];

export type BusinessClosePeriod =
  BusinessTables["business_close_periods"]["Row"];

export type BusinessCloseTask =
  BusinessTables["business_close_tasks"]["Row"];

export type BusinessSystemSummary = BusinessSystem & {
  owner_person_name: string | null;
  owner_user_name: string | null;
};

export type BusinessFinancialAccountSummary = BusinessFinancialAccount & {
  system_name: string | null;
};

export type BusinessResponsibilitySummary = BusinessResponsibility & {
  person_name: string | null;
  user_name: string | null;
  system_name: string | null;
  account_name: string | null;
};

export type BusinessRecurringTaskSummary = BusinessRecurringTask & {
  responsibility_name: string | null;
  system_name: string | null;
  account_name: string | null;
  completed_by_name: string | null;
  documents: BusinessRecurringTaskDocumentSummary[];
};

export type BusinessRecurringTaskDocumentSummary = {
  id: string;
  document_id: string;
  title: string;
  document_type: Database["public"]["Enums"]["document_type"];
  mime_type: string | null;
  created_at: string;
  signed_url: string | null;
};

export type BusinessServiceEngagementSummary = BusinessServiceEngagement & {
  created_by_name: string | null;
  provider_entity_name: string | null;
  client_entity_name: string | null;
  current_entity_role: "provider" | "client";
  counterparty_name: string | null;
  contract_document_title: string | null;
  contract_document_mime_type: string | null;
  contract_document_signed_url: string | null;
  total_billable_hours: number;
  unbilled_hours: number;
  unbilled_amount: number;
  invoiced_amount: number;
};

export type BusinessTimeEntrySummary = BusinessTimeEntry & {
  engagement_title: string | null;
  invoice_number: string | null;
  created_by_name: string | null;
  effective_hourly_rate: number | null;
  current_entity_role: "provider" | "client";
  counterparty_name: string | null;
  amount: number;
};

export type BusinessInvoiceSummary = BusinessInvoice & {
  engagement_title: string | null;
  created_by_name: string | null;
  current_entity_role: "provider" | "client";
  counterparty_name: string | null;
  entry_count: number;
  time_entry_ids: string[];
  total_hours: number;
  total_amount: number;
};

export type BusinessCloseTemplateTaskSummary = BusinessCloseTemplateTask & {
  system_name: string | null;
  account_name: string | null;
};

export type BusinessCloseTemplateSummary = BusinessCloseTemplate & {
  created_by_name: string | null;
  tasks: BusinessCloseTemplateTaskSummary[];
};

export type BusinessCloseTaskSummary = BusinessCloseTask & {
  assigned_user_name: string | null;
  assigned_person_name: string | null;
  completed_by_name: string | null;
  system_name: string | null;
  account_name: string | null;
};

export type BusinessClosePeriodSummary = BusinessClosePeriod & {
  owner_user_name: string | null;
  tasks: BusinessCloseTaskSummary[];
};

export type BusinessBookkeepingSnapshot = {
  profile: BusinessProfileSummary | null;
  businessAddress: string | null;
  serviceEngagements: BusinessServiceEngagementSummary[];
  timeEntries: BusinessTimeEntrySummary[];
  invoices: BusinessInvoiceSummary[];
  systems: BusinessSystemSummary[];
  accounts: BusinessFinancialAccountSummary[];
  responsibilities: BusinessResponsibilitySummary[];
  recurringTasks: BusinessRecurringTaskSummary[];
  closeTemplates: BusinessCloseTemplateSummary[];
  closePeriods: BusinessClosePeriodSummary[];
};
