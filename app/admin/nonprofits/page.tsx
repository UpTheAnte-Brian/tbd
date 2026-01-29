import AdminNonprofitsClient from "@/app/admin/nonprofits/_components/AdminNonprofitsClient";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

export default function AdminNonprofitsPage() {
  if (areAdminToolsDisabled()) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 text-sm text-brand-secondary-2">
        Admin tools are disabled.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-page px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <AdminNonprofitsClient />
      </div>
    </div>
  );
}
