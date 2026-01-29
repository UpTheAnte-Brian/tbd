import AdminPageShell from "@/app/admin/_components/AdminPageShell";
import AdminCardGrid from "@/app/components/admin/AdminCardGrid";
import AdminStatusPanel from "@/app/components/admin/AdminStatusPanel";
import { assertAdmin } from "@/app/lib/auth/assertAdmin";
import { getAdminSummary } from "@/domain/admin/admin-summary";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (areAdminToolsDisabled()) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 text-sm text-brand-secondary-0">
        Admin tools are disabled.
      </div>
    );
  }

  let adminAccess: Awaited<ReturnType<typeof assertAdmin>>;
  try {
    adminAccess = await assertAdmin();
  } catch {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 text-sm text-brand-secondary-0">
        Admin access required. Add your email or user id to
        {" "}
        <span className="font-semibold text-text-on-light">
          ADMIN_ALLOWLIST
        </span>
        .
      </div>
    );
  }

  const summary = await getAdminSummary();

  return (
    <AdminPageShell
      title="Admin Console"
      subtitle="Operator console for ingest, data ops, and security workflows."
    >
      <div className="rounded-lg border border-border-subtle bg-surface-card px-4 py-3 text-xs text-brand-secondary-0">
        Signed in as{" "}
        <span className="font-semibold text-text-on-light">
          {adminAccess.email ?? adminAccess.userId}
        </span>{" "}
        ({adminAccess.method === "allowlist" ? "allowlist" : "profile role"}).
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <AdminCardGrid />
        <AdminStatusPanel summary={summary} />
      </div>
    </AdminPageShell>
  );
}
