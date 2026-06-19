import NewBusinessForm from "@/app/admin/businesses/new/_components/NewBusinessForm";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

export default function AdminBusinessNewPage() {
  if (areAdminToolsDisabled()) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 text-sm text-brand-secondary-2">
        Admin tools are disabled.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-page px-4 py-6 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-text-on-light">
            New Business
          </h1>
          <p className="text-sm text-text-on-light">
            Create a business entity and open its public entity page.
          </p>
        </header>
        <NewBusinessForm />
      </div>
    </div>
  );
}
