import "server-only";
import { createApiClient } from "@/utils/supabase/route";
import type { Database } from "@/database.types";

export type EntityAiAccountSummary = {
  account_id: string;
  entity_id: string;
  status: "active" | "paused" | "closed";
  display_name: string | null;
  monthly_budget_credits: number;
  hard_limit_credits: number;
  low_balance_threshold_credits: number;
  balance_credits: number;
  month_usage_credits: number;
  last_funded_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EntityAiLedgerEntry = {
  id: string;
  entity_id: string;
  direction: "credit" | "debit" | "adjustment" | "refund";
  amount_credits: number;
  money_amount_cents: number | null;
  source_type:
    | "donation"
    | "subscription"
    | "usage"
    | "admin_adjustment"
    | "promo"
    | "refund";
  source_id: string | null;
  description: string | null;
  created_at: string;
};

export type EntityAiUsageEvent = {
  id: string;
  entity_id: string;
  agent_run_id: string | null;
  capability: string;
  provider: string | null;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  provider_cost_cents: number;
  billed_credits: number;
  status: "estimated" | "succeeded" | "failed" | "refunded";
  created_at: string;
};

export type EntityAgentConfig = {
  id: string;
  entity_id: string;
  status: "draft" | "active" | "paused";
  instructions: string | null;
  enabled_capabilities: Record<string, unknown>;
  safety_policy: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EntityAiAccountDTO = {
  account: EntityAiAccountSummary;
  ledger: EntityAiLedgerEntry[];
  usage: EntityAiUsageEvent[];
  agent: EntityAgentConfig | null;
};

type ApiClient = Awaited<ReturnType<typeof createApiClient>>;
type EntityAiAccountSummaryRow =
  Database["public"]["Views"]["entity_ai_account_summaries"]["Row"];

function mapAccountSummary(
  row: EntityAiAccountSummaryRow,
): EntityAiAccountSummary {
  if (!row.account_id || !row.entity_id || !row.status) {
    throw new Error("AI account summary is incomplete");
  }

  return {
    account_id: row.account_id,
    entity_id: row.entity_id,
    status: row.status as EntityAiAccountSummary["status"],
    display_name: row.display_name,
    monthly_budget_credits: row.monthly_budget_credits ?? 0,
    hard_limit_credits: row.hard_limit_credits ?? 0,
    low_balance_threshold_credits: row.low_balance_threshold_credits ?? 0,
    balance_credits: row.balance_credits ?? 0,
    month_usage_credits: row.month_usage_credits ?? 0,
    last_funded_at: row.last_funded_at,
    last_used_at: row.last_used_at,
    created_at: row.created_at ?? new Date(0).toISOString(),
    updated_at: row.updated_at ?? new Date(0).toISOString(),
  };
}

async function assertCanReadEntity(
  supabase: ApiClient,
  entityId: string,
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: canRead, error } = await supabase.rpc("can_read_entity", {
    p_entity_id: entityId,
    p_user_id: user.id,
  });

  if (error) {
    throw error;
  }

  if (!canRead) {
    throw new Error("Forbidden");
  }
}

export async function getEntityAiAccountDTO(
  entityId: string,
): Promise<EntityAiAccountDTO> {
  const supabase = await createApiClient();
  await assertCanReadEntity(supabase, entityId);

  const { error: ensureError } = await supabase.rpc("ensure_entity_ai_account", {
    p_entity_id: entityId,
  });

  if (ensureError) {
    throw ensureError;
  }

  const { data: account, error: accountError } = await supabase
    .from("entity_ai_account_summaries")
    .select(
      [
        "account_id",
        "entity_id",
        "status",
        "display_name",
        "monthly_budget_credits",
        "hard_limit_credits",
        "low_balance_threshold_credits",
        "balance_credits",
        "month_usage_credits",
        "last_funded_at",
        "last_used_at",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq("entity_id", entityId)
    .maybeSingle();

  if (accountError) {
    throw accountError;
  }

  if (!account) {
    throw new Error("AI account not found");
  }

  const [ledgerResult, usageResult, agentResult] = await Promise.all([
    supabase
      .from("entity_ai_credit_ledger")
      .select(
        [
          "id",
          "entity_id",
          "direction",
          "amount_credits",
          "money_amount_cents",
          "source_type",
          "source_id",
          "description",
          "created_at",
        ].join(","),
      )
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("entity_ai_usage_events")
      .select(
        [
          "id",
          "entity_id",
          "agent_run_id",
          "capability",
          "provider",
          "model",
          "input_tokens",
          "output_tokens",
          "cached_tokens",
          "provider_cost_cents",
          "billed_credits",
          "status",
          "created_at",
        ].join(","),
      )
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("entity_agents")
      .select(
        [
          "id",
          "entity_id",
          "status",
          "instructions",
          "enabled_capabilities",
          "safety_policy",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .eq("entity_id", entityId)
      .maybeSingle(),
  ]);

  if (ledgerResult.error) throw ledgerResult.error;
  if (usageResult.error) throw usageResult.error;
  if (agentResult.error) throw agentResult.error;

  return {
    account: mapAccountSummary(account as unknown as EntityAiAccountSummaryRow),
    ledger: (ledgerResult.data ?? []) as unknown as EntityAiLedgerEntry[],
    usage: (usageResult.data ?? []) as unknown as EntityAiUsageEvent[],
    agent: (agentResult.data ?? null) as unknown as EntityAgentConfig | null,
  };
}
