import Link from "next/link";
import AdminPageShell from "@/app/admin/_components/AdminPageShell";
import { getBusinesses } from "@/domain/businesses/businesses-dto";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

export const dynamic = "force-dynamic";

function formatWebsite(value: string | null | undefined) {
  if (!value) return "--";
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default async function AdminBusinessesPage() {
  if (areAdminToolsDisabled()) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 text-sm text-brand-secondary-2">
        Admin tools are disabled.
      </div>
    );
  }

  const businesses = await getBusinesses();

  return (
    <AdminPageShell
      title="Admin · Businesses"
      subtitle="Create and manage business entities."
    >
      <section className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-secondary-0">
              Registry
            </p>
            <h2 className="mt-1 text-lg font-semibold text-text-on-light">
              {businesses.length} businesses in the system
            </h2>
            <p className="mt-1 text-sm text-brand-secondary-0">
              New businesses created here get an entity shell immediately.
            </p>
          </div>
          <Link
            href="/admin/businesses/new"
            className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-text-on-light shadow-sm transition hover:bg-brand-primary/90"
          >
            New business
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-sm">
        {businesses.length === 0 ? (
          <div className="p-6 text-sm text-brand-secondary-0">
            No businesses exist yet. Create the first one from the admin flow.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-subtle">
              <thead className="bg-surface-inset">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-brand-secondary-0">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Place ID</th>
                  <th className="px-4 py-3">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-white">
                {businesses.map((business) => (
                  <tr key={business.id} className="text-sm text-text-on-light">
                    <td className="px-4 py-3 font-medium">{business.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-border-subtle bg-surface-inset px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-secondary-0">
                        {business.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {business.website ? (
                        <a
                          href={business.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-primary-0 hover:underline"
                        >
                          {formatWebsite(business.website)}
                        </a>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-secondary-0">
                      {business.place_id ?? "--"}
                    </td>
                    <td className="px-4 py-3">
                      {business.entity_id ? (
                        <Link
                          href={`/entities/${business.entity_id}`}
                          className="text-brand-primary-0 hover:underline"
                        >
                          View entity
                        </Link>
                      ) : (
                        <span className="text-brand-secondary-0">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminPageShell>
  );
}
