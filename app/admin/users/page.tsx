import AdminUsersClient from "@/app/admin/users/_components/AdminUsersClient";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

export const dynamic = "force-dynamic";

export default function AdminUsersPage() {
  if (areAdminToolsDisabled()) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 text-sm text-brand-secondary-2">
        Admin tools are disabled.
      </div>
    );
  }

  return <AdminUsersClient />;
}
