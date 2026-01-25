import Link from "next/link";

export default function UpTheAntePage() {
  return (
    <div className="min-h-screen bg-brand-secondary-2 text-brand-primary-0 font-brand">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 -translate-x-1/4 -translate-y-1/3 rounded-full bg-brand-accent-1 opacity-20 blur-3xl info-float-slow" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 translate-x-1/3 translate-y-1/4 rounded-full bg-brand-primary-0 opacity-10 blur-3xl info-float-slower" />

        <div className="mx-auto max-w-6xl px-6 pb-20 pt-14">
          <div className="grid items-start gap-10 md:grid-cols-[1.1fr_0.9fr]">
            <div className="info-fade-up">
              <p className="text-sm uppercase tracking-[0.3em] text-brand-secondary-0">
                Charitable stewardship
              </p>
              <h1 className="mt-4 font-brand-heading text-4xl font-semibold leading-tight md:text-5xl">
                Up the Ante keeps local giving clear, accountable, and close to
                home.
              </h1>
              <p className="mt-4 text-xl text-brand-secondary-0">
                Up the Ante is a charitable nonprofit. Donations are made to Up
                the Ante, then distributed to local causes through a transparent
                reporting process.
              </p>
            </div>

            <div
              className="rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-6 info-fade-up"
              style={{ animationDelay: "120ms" }}
            >
              <h2 className="font-brand-heading text-2xl font-semibold">
                Donation clarity
              </h2>
              <ul className="mt-4 space-y-3 text-base text-brand-secondary-0">
                <li>Donations are made to Up the Ante.</li>
                <li>Funds are distributed to local nonprofits and schools.</li>
                <li>Financials and impact reporting will be published.</li>
              </ul>
            </div>
          </div>

          <section
            className="mt-14 info-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            <h2 className="font-brand-heading text-3xl font-semibold">
              What Up the Ante does
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-6">
                <h3 className="font-brand-heading text-xl font-semibold">
                  Stewardship and trust
                </h3>
                <ul className="mt-3 space-y-3 text-base text-brand-secondary-0">
                  <li>Receives donor funds.</li>
                  <li>Manages donor-restricted allocations.</li>
                  <li>Distributes funds to verified local causes.</li>
                  <li>Publishes public-facing reports.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-6">
                <h3 className="font-brand-heading text-xl font-semibold">
                  A simple giving experience
                </h3>
                <ul className="mt-3 space-y-3 text-base text-brand-secondary-0">
                  <li>Partners with retailers for round-up campaigns.</li>
                  <li>Supports districts and nonprofits with clear reporting.</li>
                  <li>Keeps fundraising consistent, not seasonal.</li>
                  <li>Prioritizes local impact over one-time campaigns.</li>
                </ul>
              </div>
            </div>
          </section>

          <section
            className="mt-14 info-fade-up"
            style={{ animationDelay: "260ms" }}
          >
            <div className="rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-6">
              <h2 className="font-brand-heading text-2xl font-semibold">
                Service agreement transparency
              </h2>
              <p className="mt-3 text-base text-brand-secondary-0">
                Technology and operational support are provided by Ante Up
                Nation under a service agreement.
              </p>
            </div>
          </section>

          <section
            className="mt-14 info-fade-up"
            style={{ animationDelay: "320ms" }}
          >
            <h2 className="font-brand-heading text-3xl font-semibold">
              How round up works
            </h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "You round up at checkout",
                  detail: "A small amount is added to your purchase total.",
                },
                {
                  title: "Up the Ante receives the donation",
                  detail: "Funds are held by the charitable nonprofit.",
                },
                {
                  title: "Local causes receive support",
                  detail: "Donations are distributed and reported publicly.",
                },
              ].map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-accent-0 text-base font-semibold text-brand-secondary-2">
                      {index + 1}
                    </span>
                    <p className="text-base font-semibold">{step.title}</p>
                  </div>
                  <p className="mt-3 text-sm text-brand-secondary-0">
                    {step.detail}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section
            className="mt-14 info-fade-up"
            style={{ animationDelay: "380ms" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-6">
              <div>
                <h2 className="font-brand-heading text-2xl font-semibold">
                  Want the full structure view?
                </h2>
                <p className="mt-2 text-base text-brand-secondary-0">
                  See how the nonprofit and the LLC work together.
                </p>
              </div>
              <Link
                className="rounded-full border border-brand-secondary-1 bg-brand-accent-0 px-4 py-2 text-base font-semibold text-brand-secondary-2 transition hover:bg-brand-accent-1"
                href="/info"
              >
                How it works
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
