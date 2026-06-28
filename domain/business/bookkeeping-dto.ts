import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import {
  type BusinessBookkeepingSnapshot,
  type BusinessClosePeriod,
  type BusinessClosePeriodSummary,
  type BusinessCloseTask,
  type BusinessCloseTemplate,
  type BusinessCloseTemplateSummary,
  type BusinessCloseTemplateTask,
  type BusinessFinancialAccount,
  type BusinessFinancialAccountSummary,
  type BusinessProfile,
  type BusinessResponsibility,
  type BusinessResponsibilitySummary,
  type BusinessSystem,
  type BusinessSystemSummary,
} from "@/domain/business/bookkeeping";
import { createApiClient } from "@/utils/supabase/route";

async function getBookkeepingClient(): Promise<SupabaseClient<Database>> {
  return createApiClient();
}

function businessTable<
  TableName extends keyof Database["business"]["Tables"],
>(
  supabase: SupabaseClient<Database>,
  table: TableName,
) {
  return supabase.schema("business").from(table);
}

async function fetchProfileNames(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);

  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  (data ?? []).forEach((row) => {
    if (row?.id) {
      map.set(String(row.id), row.full_name?.trim() || String(row.id));
    }
  });
  return map;
}

async function fetchPersonNames(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from("entity_person_roles")
    .select("id, display_name")
    .in("id", ids);

  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  (data ?? []).forEach((row) => {
    if (row?.id) {
      map.set(String(row.id), row.display_name?.trim() || String(row.id));
    }
  });
  return map;
}

export async function getEntityBookkeepingSnapshot(
  entityId: string,
): Promise<BusinessBookkeepingSnapshot> {
  const supabase = await getBookkeepingClient();

  const { data: entity, error: entityError } = await supabase
    .from("entities")
    .select("id, entity_type")
    .eq("id", entityId)
    .maybeSingle();

  if (entityError) {
    throw new Error(entityError.message);
  }

  if (!entity || entity.entity_type !== "business") {
    throw new Error("Business entity not found");
  }

  const [
    profileResult,
    systemsResult,
    accountsResult,
    responsibilitiesResult,
    closeTemplatesResult,
    closePeriodsResult,
  ] = await Promise.all([
    businessTable(supabase, "business_profiles")
      .select("*")
      .eq("entity_id", entityId)
      .maybeSingle(),
    businessTable(supabase, "business_systems")
      .select("*")
      .eq("entity_id", entityId)
      .order("system_type", { ascending: true })
      .order("system_name", { ascending: true })
      .returns<BusinessSystem[]>(),
    businessTable(supabase, "business_financial_accounts")
      .select("*")
      .eq("entity_id", entityId)
      .order("account_type", { ascending: true })
      .order("account_name", { ascending: true })
      .returns<BusinessFinancialAccount[]>(),
    businessTable(supabase, "business_responsibilities")
      .select("*")
      .eq("entity_id", entityId)
      .order("responsibility_type", { ascending: true })
      .order("is_primary", { ascending: false })
      .returns<BusinessResponsibility[]>(),
    businessTable(supabase, "business_close_templates")
      .select("*")
      .eq("entity_id", entityId)
      .order("is_active", { ascending: false })
      .order("name", { ascending: true })
      .returns<BusinessCloseTemplate[]>(),
    businessTable(supabase, "business_close_periods")
      .select("*")
      .eq("entity_id", entityId)
      .order("period_end", { ascending: false })
      .limit(6)
      .returns<BusinessClosePeriod[]>(),
  ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (systemsResult.error) throw new Error(systemsResult.error.message);
  if (accountsResult.error) throw new Error(accountsResult.error.message);
  if (responsibilitiesResult.error) {
    throw new Error(responsibilitiesResult.error.message);
  }
  if (closeTemplatesResult.error) {
    throw new Error(closeTemplatesResult.error.message);
  }
  if (closePeriodsResult.error) {
    throw new Error(closePeriodsResult.error.message);
  }

  const profile = (profileResult.data as BusinessProfile | null) ?? null;
  const systems = systemsResult.data ?? [];
  const accounts = accountsResult.data ?? [];
  const responsibilities = responsibilitiesResult.data ?? [];
  const closeTemplates = closeTemplatesResult.data ?? [];
  const closePeriods = closePeriodsResult.data ?? [];

  const templateIds = closeTemplates.map((template) => template.id);
  const closePeriodIds = closePeriods.map((period) => period.id);

  const [templateTasksResult, closeTasksResult] = await Promise.all([
    templateIds.length > 0
      ? businessTable(supabase, "business_close_template_tasks")
        .select("*")
        .in("template_id", templateIds)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true })
        .returns<BusinessCloseTemplateTask[]>()
      : Promise.resolve({ data: [], error: null }),
    closePeriodIds.length > 0
      ? businessTable(supabase, "business_close_tasks")
        .select("*")
        .in("close_period_id", closePeriodIds)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("title", { ascending: true })
        .returns<BusinessCloseTask[]>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (templateTasksResult.error) {
    throw new Error(templateTasksResult.error.message);
  }
  if (closeTasksResult.error) {
    throw new Error(closeTasksResult.error.message);
  }

  const templateTasks = templateTasksResult.data ?? [];
  const closeTasks = closeTasksResult.data ?? [];

  const personIds = Array.from(
    new Set([
      ...systems
        .map((system) => system.owner_person_role_id)
        .filter((value): value is string => Boolean(value)),
      ...responsibilities
        .map((responsibility) => responsibility.person_role_id)
        .filter((value): value is string => Boolean(value)),
      ...closeTasks
        .map((task) => task.assigned_person_role_id)
        .filter((value): value is string => Boolean(value)),
    ]),
  );

  const userIds = Array.from(
    new Set([
      ...systems
        .map((system) => system.owner_user_id)
        .filter((value): value is string => Boolean(value)),
      ...responsibilities
        .map((responsibility) => responsibility.user_id)
        .filter((value): value is string => Boolean(value)),
      ...closeTemplates
        .map((template) => template.created_by)
        .filter((value): value is string => Boolean(value)),
      ...closePeriods
        .map((period) => period.owner_user_id)
        .filter((value): value is string => Boolean(value)),
      ...closeTasks
        .map((task) => task.assigned_user_id)
        .filter((value): value is string => Boolean(value)),
      ...closeTasks
        .map((task) => task.completed_by)
        .filter((value): value is string => Boolean(value)),
    ]),
  );

  const [personNames, userNames] = await Promise.all([
    fetchPersonNames(supabase, personIds),
    fetchProfileNames(supabase, userIds),
  ]);

  const systemNames = new Map(
    systems.map((system) => [system.id, system.system_name]),
  );
  const accountNames = new Map(
    accounts.map((account) => [account.id, account.account_name]),
  );

  const systemSummaries: BusinessSystemSummary[] = systems.map((system) => ({
    ...system,
    owner_person_name: system.owner_person_role_id
      ? personNames.get(system.owner_person_role_id) ?? null
      : null,
    owner_user_name: system.owner_user_id
      ? userNames.get(system.owner_user_id) ?? null
      : null,
  }));

  const accountSummaries: BusinessFinancialAccountSummary[] = accounts.map(
    (account) => ({
      ...account,
      system_name: account.system_id
        ? systemNames.get(account.system_id) ?? null
        : null,
    }),
  );

  const responsibilitySummaries: BusinessResponsibilitySummary[] =
    responsibilities.map((responsibility) => ({
      ...responsibility,
      person_name: responsibility.person_role_id
        ? personNames.get(responsibility.person_role_id) ?? null
        : null,
      user_name: responsibility.user_id
        ? userNames.get(responsibility.user_id) ?? null
        : null,
      system_name: responsibility.system_id
        ? systemNames.get(responsibility.system_id) ?? null
        : null,
      account_name: responsibility.account_id
        ? accountNames.get(responsibility.account_id) ?? null
        : null,
    }));

  const templateTaskSummaries = templateTasks.map((task) => ({
    ...task,
    system_name: task.system_id ? systemNames.get(task.system_id) ?? null : null,
    account_name: task.account_id
      ? accountNames.get(task.account_id) ?? null
      : null,
  }));

  const templateTasksByTemplateId = new Map<string, typeof templateTaskSummaries>();
  templateTaskSummaries.forEach((task) => {
    const list = templateTasksByTemplateId.get(task.template_id) ?? [];
    list.push(task);
    templateTasksByTemplateId.set(task.template_id, list);
  });

  const closeTemplateSummaries: BusinessCloseTemplateSummary[] = closeTemplates
    .map((template) => ({
      ...template,
      created_by_name: template.created_by
        ? userNames.get(template.created_by) ?? null
        : null,
      tasks: templateTasksByTemplateId.get(template.id) ?? [],
    }));

  const closeTaskSummaries = closeTasks.map((task) => ({
    ...task,
    assigned_user_name: task.assigned_user_id
      ? userNames.get(task.assigned_user_id) ?? null
      : null,
    assigned_person_name: task.assigned_person_role_id
      ? personNames.get(task.assigned_person_role_id) ?? null
      : null,
    completed_by_name: task.completed_by
      ? userNames.get(task.completed_by) ?? null
      : null,
    system_name: task.system_id ? systemNames.get(task.system_id) ?? null : null,
    account_name: task.account_id
      ? accountNames.get(task.account_id) ?? null
      : null,
  }));

  const closeTasksByPeriodId = new Map<string, typeof closeTaskSummaries>();
  closeTaskSummaries.forEach((task) => {
    const list = closeTasksByPeriodId.get(task.close_period_id) ?? [];
    list.push(task);
    closeTasksByPeriodId.set(task.close_period_id, list);
  });

  const closePeriodSummaries: BusinessClosePeriodSummary[] = closePeriods.map(
    (period) => ({
      ...period,
      owner_user_name: period.owner_user_id
        ? userNames.get(period.owner_user_id) ?? null
        : null,
      tasks: closeTasksByPeriodId.get(period.id) ?? [],
    }),
  );

  return {
    profile,
    systems: systemSummaries,
    accounts: accountSummaries,
    responsibilities: responsibilitySummaries,
    closeTemplates: closeTemplateSummaries,
    closePeriods: closePeriodSummaries,
  };
}
