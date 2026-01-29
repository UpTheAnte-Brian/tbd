import Link from "next/link";
import AdminPageShell from "@/app/admin/_components/AdminPageShell";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

type AdminPlaceholderProps = {
  title: string;
  description?: string;
};

export default function AdminPlaceholder({
  title,
  description,
}: AdminPlaceholderProps) {
  if (areAdminToolsDisabled()) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 text-sm text-brand-secondary-0">
        Admin tools are disabled.
      </div>
    );
  }

  return (
    <AdminPageShell title={title} subtitle={description}>
      <div className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-brand-secondary-0">
            This admin tool is scaffolded. Add workflows, queries, and UI when
            you are ready.
          </p>
          <Link
            href="/admin"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary-0"
          >
            Back to console
          </Link>
        </div>
      </div>
    </AdminPageShell>
  );
}
