export default function EntityLoading() {
  return (
    <div className="min-h-screen bg-surface-page p-4 text-text-on-light">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="h-10 w-48 rounded bg-surface-inset" />
        <div className="grid gap-4 md:grid-cols-[280px_1fr]">
          <div className="rounded-2xl border border-border-subtle bg-surface-card p-4">
            <div className="h-20 w-full rounded bg-surface-inset" />
            <div className="mt-4 space-y-2">
              <div className="h-4 w-3/4 rounded bg-surface-inset" />
              <div className="h-4 w-2/3 rounded bg-surface-inset" />
              <div className="h-4 w-1/2 rounded bg-surface-inset" />
            </div>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-surface-card p-6">
            <div className="h-6 w-40 rounded bg-surface-inset" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full rounded bg-surface-inset" />
              <div className="h-4 w-5/6 rounded bg-surface-inset" />
              <div className="h-4 w-4/6 rounded bg-surface-inset" />
              <div className="h-4 w-3/6 rounded bg-surface-inset" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
