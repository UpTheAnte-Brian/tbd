import NewNonprofitForm from "@/app/admin/nonprofits/new/_components/NewNonprofitForm";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

export default async function AdminNonprofitNewPage({
  searchParams,
}: {
  searchParams?: Promise<{ district_entity_id?: string; scope_id?: string }>;
}) {
  if (areAdminToolsDisabled()) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 text-sm text-brand-secondary-2">
        Admin tools are disabled.
      </div>
    );
  }

  const resolvedParams = await searchParams;

  return (
    <div className="min-h-screen bg-surface-page px-4 py-6 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-text-on-light">
            New Nonprofit
          </h1>
          <p className="text-sm text-text-on-light">
            Create a minimal nonprofit shell and continue onboarding.
          </p>
        </header>
        <NewNonprofitForm
          defaultDistrictEntityId={resolvedParams?.district_entity_id ?? ""}
          scopeId={resolvedParams?.scope_id ?? null}
        />
      </div>
    </div>
  );
}
