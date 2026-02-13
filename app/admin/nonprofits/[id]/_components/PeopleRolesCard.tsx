"use client";

import type { AdminNonprofitReview } from "@/app/admin/nonprofits/types";

type Props = {
  people: AdminNonprofitReview["people"];
  latestReturn: AdminNonprofitReview["latest_return"];
  entityId?: string | null;
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }
  return moneyFormatter.format(value);
}

function formatRole(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function PeopleRolesCard({
  people,
  latestReturn,
  entityId,
}: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-on-light">
          People & Roles
        </h2>
        {entityId ? (
          <a
            href={`/entities/${entityId}?tab=people`}
            className="rounded border border-gray-200 px-3 py-1 text-xs text-brand-secondary-2 hover:border-gray-300"
          >
            Manage People
          </a>
        ) : null}
      </div>
      {!latestReturn ? (
        <p className="mt-3 text-sm text-brand-secondary-2">
          No return available.
        </p>
      ) : people.length === 0 ? (
        <p className="mt-3 text-sm text-brand-secondary-2">
          No people parsed for this return.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-brand-secondary-0">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Title/Role</th>
                <th className="px-3 py-2">Compensation</th>
                <th className="px-3 py-2">Officer/Director</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {people.map((person) => {
                const isOfficerDirector =
                  person.role === "officer" || person.role === "director";
                const compensation =
                  person.reportable_compensation ??
                  person.other_compensation ??
                  null;
                return (
                  <tr key={person.id} className="hover:bg-surface-inset/50">
                    <td className="px-3 py-2 font-medium text-text-on-light">
                      {person.name}
                    </td>
                    <td className="px-3 py-2 text-text-on-light">
                      {person.title ?? formatRole(person.role)}
                    </td>
                    <td className="px-3 py-2 text-text-on-light">
                      {formatMoney(compensation)}
                    </td>
                    <td className="px-3 py-2 text-text-on-light">
                      {isOfficerDirector ? "Yes" : "No"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
