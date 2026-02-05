import AdminNonprofitReview from "@/app/admin/nonprofits/_components/AdminNonprofitReview";
import { areAdminToolsDisabled } from "@/utils/admin-tools";

export default async function AdminNonprofitReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (areAdminToolsDisabled()) {
    console.log("Admin tools are disabled.");
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 text-sm text-brand-secondary-2">
        Admin tools are disabled.
      </div>
    );
  }

  const { id } = await params;

  return (
    <div className="min-h-screen bg-surface-page px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <AdminNonprofitReview ein={id} />
      </div>
    </div>
  );
}
