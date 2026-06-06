import "server-only";
import { supabaseAdmin } from "@/utils/supabase/service-worker";
import type { EntityAiUsageEvent } from "@/domain/ai/entity-ai-dto";
import type { Json } from "@/database.types";

export type RecordEntityAiUsageInput = {
  entityId: string;
  capability: string;
  billedCredits: number;
  provider?: string | null;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  providerCostCents?: number;
  status?: EntityAiUsageEvent["status"];
  agentRunId?: string | null;
  metadata?: Json;
  createdBy?: string | null;
};

function nonNegativeInteger(value: number | undefined, fallback = 0) {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 0) {
    throw new Error("AI usage values must be non-negative integers");
  }
  return resolved;
}

function normalizeMetadata(metadata: Json | undefined): Json {
  return metadata ?? {};
}

export async function recordEntityAiUsage(
  input: RecordEntityAiUsageInput,
): Promise<EntityAiUsageEvent> {
  if (!input.entityId) {
    throw new Error("entityId is required");
  }

  if (!input.capability.trim()) {
    throw new Error("capability is required");
  }

  const billedCredits = nonNegativeInteger(input.billedCredits);
  const inputTokens = nonNegativeInteger(input.inputTokens);
  const outputTokens = nonNegativeInteger(input.outputTokens);
  const cachedTokens = nonNegativeInteger(input.cachedTokens);
  const providerCostCents = nonNegativeInteger(input.providerCostCents);

  const { data, error } = await supabaseAdmin.rpc("record_entity_ai_usage", {
    p_entity_id: input.entityId,
    p_capability: input.capability,
    p_billed_credits: billedCredits,
    p_provider: input.provider ?? undefined,
    p_model: input.model ?? undefined,
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
    p_cached_tokens: cachedTokens,
    p_provider_cost_cents: providerCostCents,
    p_status: input.status ?? "succeeded",
    p_agent_run_id: input.agentRunId ?? undefined,
    p_metadata: normalizeMetadata(input.metadata),
    p_created_by: input.createdBy ?? undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as EntityAiUsageEvent;
}

export function estimateCreditsFromCostCents(costCents: number) {
  return nonNegativeInteger(Math.ceil(costCents));
}
