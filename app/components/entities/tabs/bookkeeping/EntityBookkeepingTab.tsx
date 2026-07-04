"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import type { BusinessBookkeepingSnapshot } from "@/domain/business/bookkeeping";

type Props = {
  entityId: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
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

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-text-on-light">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function EntityBookkeepingTab({ entityId }: Props) {
  const [snapshot, setSnapshot] = useState<BusinessBookkeepingSnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    fetchSnapshot();
    return () => {
      cancelled = true;
    };
  }, [entityId]);

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

  const profile = snapshot.profile;

  return (
    <div className="space-y-6">
      <Section title="Profile">
        {profile ? (
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-brand-secondary-0 opacity-70">Legal Name</dt>
              <dd className="font-medium text-brand-secondary-0">
                {formatText(profile.legal_name)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary-0 opacity-70">DBA</dt>
              <dd className="font-medium text-brand-secondary-0">
                {formatText(profile.dba_name)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary-0 opacity-70">EIN</dt>
              <dd className="font-medium text-brand-secondary-0">
                {formatText(profile.ein)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary-0 opacity-70">
                State of Formation
              </dt>
              <dd className="font-medium text-brand-secondary-0">
                {formatText(profile.state_of_formation)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary-0 opacity-70">Structure</dt>
              <dd className="font-medium text-brand-secondary-0">
                {formatText(profile.entity_structure)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary-0 opacity-70">
                Accounting Basis
              </dt>
              <dd className="font-medium capitalize text-brand-secondary-0">
                {formatText(profile.default_accounting_basis)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary-0 opacity-70">Close Cadence</dt>
              <dd className="font-medium capitalize text-brand-secondary-0">
                {formatStatus(profile.close_cadence)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary-0 opacity-70">Status</dt>
              <dd className="font-medium capitalize text-brand-secondary-0">
                {formatStatus(profile.bookkeeping_status)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-brand-secondary-0 opacity-70">
            No business bookkeeping profile has been created yet.
          </p>
        )}
      </Section>

      <Section title={`Systems (${snapshot.systems.length})`}>
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
                  <span className="rounded-full bg-surface-nav px-2 py-1 text-xs uppercase tracking-wide text-text-on-dark">
                    {formatStatus(system.status)}
                  </span>
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

      <Section title={`Accounts (${snapshot.accounts.length})`}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={`Responsibilities (${snapshot.responsibilities.length})`}>
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
                  {responsibility.is_primary ? (
                    <span className="rounded-full bg-surface-nav px-2 py-1 text-xs uppercase tracking-wide text-text-on-dark">
                      Primary
                    </span>
                  ) : null}
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

      <Section title={`Close Templates (${snapshot.closeTemplates.length})`}>
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
                  <span className="rounded-full bg-surface-nav px-2 py-1 text-xs uppercase tracking-wide text-text-on-dark">
                    {template.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
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

      <Section title={`Recent Close Periods (${snapshot.closePeriods.length})`}>
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
                  <span className="rounded-full bg-surface-nav px-2 py-1 text-xs uppercase tracking-wide text-text-on-dark">
                    {formatStatus(period.status)}
                  </span>
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
