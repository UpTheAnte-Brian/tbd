"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EntityAiAccountDTO,
  EntityAiLedgerEntry,
  EntityAiUsageEvent,
} from "@/domain/ai/entity-ai-dto";

type Props = {
  entityId: string;
  entityName: string;
};

const presetFundingAmounts = [25, 50, 100, 250];

function formatCredits(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMoney(cents: number | null) {
  if (cents === null) return "n/a";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function humanizeUnderscoreLabel(value: string) {
  return value.replace(/_/g, " ");
}

function ledgerLabel(entry: EntityAiLedgerEntry) {
  if (entry.description) return entry.description;
  if (entry.source_type === "donation") return "AI credit donation";
  if (entry.source_type === "usage") return "Agent usage";
  return humanizeUnderscoreLabel(entry.source_type);
}

function usageLabel(entry: EntityAiUsageEvent) {
  return humanizeUnderscoreLabel(entry.capability);
}

export default function EntityAgentTab({ entityId, entityName }: Props) {
  const [data, setData] = useState<EntityAiAccountDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fundingAmount, setFundingAmount] = useState<number | "">(50);
  const [funding, setFunding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/entities/${entityId}/ai/account`, {
          cache: "no-store",
        });
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error ?? "Failed to load AI account");
        }
        if (!cancelled) {
          setData(body as EntityAiAccountDTO);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAccount();
    return () => {
      cancelled = true;
    };
  }, [entityId]);

  const balanceState = useMemo(() => {
    if (!data) return "empty";
    if (data.account.balance_credits <= 0) return "empty";
    if (
      data.account.balance_credits <=
        data.account.low_balance_threshold_credits
    ) {
      return "low";
    }
    return "funded";
  }, [data]);

  async function handleFundCredits() {
    const amount = fundingAmount === "" ? 0 : fundingAmount;
    if (!amount || amount <= 0) return;

    setFunding(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-ai-credit-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          amount,
          anonymous: false,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to create checkout session");
      }
      if (!body.url) {
        throw new Error("Checkout URL unavailable");
      }
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setFunding(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4 text-sm text-brand-secondary-0">
        Loading AI account...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4 text-sm text-brand-primary-2">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <section className="rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-secondary-0">
              AI Operating Balance
            </p>
            <h2 className="mt-1 text-3xl font-bold text-brand-secondary-0">
              {formatCredits(data.account.balance_credits)} credits
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-brand-secondary-0">
              Credits fund entity-scoped agent work such as public research,
              meeting support, summaries, and coordination tasks.
            </p>
          </div>
          <div
            className={`rounded border px-3 py-2 text-sm ${
              balanceState === "funded"
                ? "border-green-600 bg-green-50 text-green-800"
                : balanceState === "low"
                ? "border-yellow-600 bg-yellow-50 text-yellow-800"
                : "border-brand-secondary-1 bg-brand-secondary-1 text-brand-secondary-0"
            }`}
          >
            {balanceState === "funded"
              ? "Funded"
              : balanceState === "low"
              ? "Low balance"
              : "No credits yet"}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded border border-brand-secondary-1 p-3">
            <p className="text-xs uppercase text-brand-secondary-0">
              This month
            </p>
            <p className="mt-1 text-xl font-semibold text-brand-secondary-0">
              {formatCredits(data.account.month_usage_credits)}
            </p>
          </div>
          <div className="rounded border border-brand-secondary-1 p-3">
            <p className="text-xs uppercase text-brand-secondary-0">
              Last funded
            </p>
            <p className="mt-1 text-xl font-semibold text-brand-secondary-0">
              {formatDate(data.account.last_funded_at)}
            </p>
          </div>
          <div className="rounded border border-brand-secondary-1 p-3">
            <p className="text-xs uppercase text-brand-secondary-0">
              Agent status
            </p>
            <p className="mt-1 text-xl font-semibold capitalize text-brand-secondary-0">
              {data.agent?.status ?? "draft"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-brand-secondary-0">
              Fund {entityName}&apos;s AI capacity
            </h3>
            <p className="mt-1 text-sm text-brand-secondary-0">
              Donations are converted into AI credits and recorded in the
              entity ledger.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {presetFundingAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setFundingAmount(amount)}
                className={`rounded border px-3 py-2 text-sm ${
                  fundingAmount === amount
                    ? "border-brand-primary-0 bg-brand-primary-0 text-brand-secondary-2"
                    : "border-brand-secondary-1 bg-transparent text-brand-secondary-0 hover:bg-brand-secondary-1"
                }`}
              >
                ${amount}
              </button>
            ))}
            <input
              type="number"
              min={1}
              value={fundingAmount === "" ? "" : fundingAmount}
              onChange={(event) => {
                const value = event.target.value;
                setFundingAmount(value === "" ? "" : Number(value));
              }}
              className="h-10 w-24 rounded border border-brand-secondary-1 bg-brand-secondary-2 px-2 text-sm text-brand-secondary-0"
            />
            <button
              type="button"
              onClick={handleFundCredits}
              disabled={funding || !fundingAmount || Number(fundingAmount) <= 0}
              className="h-10 rounded bg-brand-primary-0 px-4 text-sm font-semibold text-brand-secondary-2 transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {funding ? "Opening..." : "Fund credits"}
            </button>
          </div>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-brand-primary-2">{error}</p>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4">
          <h3 className="text-lg font-semibold text-brand-secondary-0">
            Credit ledger
          </h3>
          <div className="mt-3 divide-y divide-brand-secondary-1">
            {data.ledger.length === 0 ? (
              <p className="py-4 text-sm text-brand-secondary-0">
                No credit activity yet.
              </p>
            ) : (
              data.ledger.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-brand-secondary-0">
                      {ledgerLabel(entry)}
                    </p>
                    <p className="text-xs text-brand-secondary-0">
                      {formatDate(entry.created_at)} ·{" "}
                      {formatMoney(entry.money_amount_cents)}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      entry.direction === "debit"
                        ? "text-brand-primary-2"
                        : "text-green-700"
                    }`}
                  >
                    {entry.direction === "debit" ? "-" : "+"}
                    {formatCredits(entry.amount_credits)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4">
          <h3 className="text-lg font-semibold text-brand-secondary-0">
            Usage
          </h3>
          <div className="mt-3 divide-y divide-brand-secondary-1">
            {data.usage.length === 0 ? (
              <p className="py-4 text-sm text-brand-secondary-0">
                No agent usage has been recorded yet.
              </p>
            ) : (
              data.usage.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium capitalize text-brand-secondary-0">
                      {usageLabel(entry)}
                    </p>
                    <p className="text-xs text-brand-secondary-0">
                      {formatDate(entry.created_at)} · {entry.model ?? "model pending"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-brand-primary-2">
                    -{formatCredits(entry.billed_credits)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
