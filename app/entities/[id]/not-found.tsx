import Link from "next/link";

export default function EntityNotFound() {
  return (
    <div className="min-h-screen bg-brand-secondary-1 px-4 py-12 text-brand-secondary-0">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-2xl border border-brand-secondary-2 bg-brand-secondary-2/70 p-8 shadow-lg">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.25em] text-brand-primary-2">
            Entity Not Found
          </div>
          <h1 className="text-3xl font-semibold text-brand-secondary-0">
            We couldn&apos;t find that entity.
          </h1>
          <p className="text-sm text-brand-secondary-0/80">
            The link may be outdated, or the entity might not be available yet.
            Double-check the URL or return to the directory to browse what&apos;s
            active.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-brand-primary-0 px-4 py-2 text-sm font-semibold text-brand-secondary-2 transition hover:bg-brand-primary-1"
          >
            Back to Home
          </Link>
          <Link
            href="/entities"
            className="inline-flex items-center justify-center rounded-md border border-brand-secondary-1 bg-brand-secondary-2 px-4 py-2 text-sm font-semibold text-brand-secondary-0 transition hover:bg-brand-secondary-1/60"
          >
            Browse Entities
          </Link>
        </div>
        <div className="rounded-lg border border-brand-secondary-1 bg-brand-secondary-1/60 p-4 text-xs text-brand-secondary-0/80">
          If you believe this is an error, contact support with the entity URL
          and any relevant IDs.
        </div>
      </div>
    </div>
  );
}
