import AdminNonprofitReview from "@/app/admin/nonprofits/_components/AdminNonprofitReview";

export default function AdminNonprofitReviewPage({
  params,
}: {
  params: { id: string };
}) {
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 text-sm text-brand-secondary-2">
        Admin tools are disabled in production.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-page px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <AdminNonprofitReview ein={params.id} />
      </div>
    </div>
  );
}
