import AdminNonprofitOnboardingClient from "@/app/admin/nonprofits/[id]/onboarding/_components/AdminNonprofitOnboardingClient";

export default async function AdminNonprofitOnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ scope_id?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 text-sm text-brand-secondary-2">
        Admin tools are disabled in production.
      </div>
    );
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <div className="min-h-screen bg-surface-page px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <AdminNonprofitOnboardingClient
          entityId={resolvedParams.id}
          scopeId={resolvedSearchParams?.scope_id ?? null}
        />
      </div>
    </div>
  );
}
