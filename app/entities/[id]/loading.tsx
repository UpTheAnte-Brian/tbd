export default function EntityLoading() {
  return (
    <div className="min-h-screen bg-brand-secondary-1 p-4 text-brand-secondary-0">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="h-10 w-48 rounded bg-brand-secondary-2/60" />
        <div className="grid gap-4 md:grid-cols-[280px_1fr]">
          <div className="rounded-lg border border-brand-secondary-1 bg-brand-secondary-2 p-4">
            <div className="h-20 w-full rounded bg-brand-secondary-1/70" />
            <div className="mt-4 space-y-2">
              <div className="h-4 w-3/4 rounded bg-brand-secondary-1/70" />
              <div className="h-4 w-2/3 rounded bg-brand-secondary-1/70" />
              <div className="h-4 w-1/2 rounded bg-brand-secondary-1/70" />
            </div>
          </div>
          <div className="rounded-lg border border-brand-secondary-1 bg-brand-secondary-2 p-6">
            <div className="h-6 w-40 rounded bg-brand-secondary-1/70" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full rounded bg-brand-secondary-1/70" />
              <div className="h-4 w-5/6 rounded bg-brand-secondary-1/70" />
              <div className="h-4 w-4/6 rounded bg-brand-secondary-1/70" />
              <div className="h-4 w-3/6 rounded bg-brand-secondary-1/70" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
