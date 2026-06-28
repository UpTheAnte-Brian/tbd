import type { Database } from "@/database.types";

type BusinessTables = Database["business"]["Tables"];

export type BusinessProfile =
  BusinessTables["business_profiles"]["Row"];

export type BusinessSystem =
  BusinessTables["business_systems"]["Row"];

export type BusinessFinancialAccount =
  BusinessTables["business_financial_accounts"]["Row"];

export type BusinessResponsibility =
  BusinessTables["business_responsibilities"]["Row"];

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
  profile: BusinessProfile | null;
  systems: BusinessSystemSummary[];
  accounts: BusinessFinancialAccountSummary[];
  responsibilities: BusinessResponsibilitySummary[];
  closeTemplates: BusinessCloseTemplateSummary[];
  closePeriods: BusinessClosePeriodSummary[];
};
