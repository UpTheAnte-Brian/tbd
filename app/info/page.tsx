import Link from "next/link";

export default function InformationPage() {
  return (
    <div className="min-h-screen bg-brand-secondary-2 text-brand-primary-0 font-brand">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 -translate-x-1/3 -translate-y-1/3 rounded-full bg-brand-accent-0 opacity-20 blur-3xl info-float-slow" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 translate-x-1/4 translate-y-1/4 rounded-full bg-brand-primary-0 opacity-10 blur-3xl info-float-slower" />

        <div className="mx-auto max-w-6xl px-6 pb-20 pt-14">
          <div className="grid items-start gap-10 md:grid-cols-[1.1fr_0.9fr]">
            <div className="info-fade-up">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-secondary-0">
                Structure and transparency
              </p>
              <h1 className="mt-4 font-brand-heading text-4xl font-semibold leading-tight md:text-5xl">
                How Ante Up Nation and Up the Ante work together
              </h1>
              <p className="mt-4 text-lg text-brand-secondary-0">
                Local fundraising works best when infrastructure is shared.
                This platform keeps donations local while giving districts and
                nonprofits consistent tools, reporting, and long-term support.
              </p>
            </div>

            <div
              className="rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-6 info-fade-up"
              style={{ animationDelay: "120ms" }}
            >
              <h2 className="font-brand-heading text-xl font-semibold">
                The shared mission
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-brand-secondary-0">
                <li>
                  Communities benefit when fundraising is consistent,
                  transparent, and local.
                </li>
                <li>
                  Schools and nonprofits should not need to reinvent tools to
                  keep donations flowing.
                </li>
                <li>
                  The platform exists to reduce friction, not control outcomes.
                </li>
              </ul>
            </div>
          </div>

          <section
            className="mt-14 info-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-center justify-between gap-6">
              <h2 className="font-brand-heading text-2xl font-semibold">
                Two organizations, two responsibilities
              </h2>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-6">
                <p className="text-xs uppercase tracking-[0.28em] text-brand-secondary-0">
                  Nonprofit
                </p>
                <h3 className="mt-2 font-brand-heading text-xl font-semibold">
                  Up the Ante
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-brand-secondary-0">
                  <li>Receives charitable donations.</li>
                  <li>Manages donor-restricted funds.</li>
                  <li>Distributes funds to local causes.</li>
                  <li>Publishes public-facing impact reports.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-6">
                <p className="text-xs uppercase tracking-[0.28em] text-brand-secondary-0">
                  For-profit operator
                </p>
                <h3 className="mt-2 font-brand-heading text-xl font-semibold">
                  Ante Up Nation (LLC)
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-brand-secondary-0">
                  <li>Builds and maintains the software platform.</li>
                  <li>Onboards districts, nonprofits, and retailers.</li>
                  <li>
                    Provides dashboards, reporting, and compliance tooling.
                  </li>
                  <li>Supports long-term sustainability of programs.</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-sm text-brand-secondary-0">
              These organizations are legally distinct and operate under
              separate governance structures.
            </p>
          </section>

          <section
            className="mt-14 info-fade-up"
            style={{ animationDelay: "260ms" }}
          >
            <h2 className="font-brand-heading text-2xl font-semibold">
              How money flows
            </h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {[
                {
                  title: "Customer rounds up at checkout",
                  detail:
                    "Retail partners invite customers to round up their total.",
                },
                {
                  title: "Donation is received by Up the Ante",
                  detail: "Up the Ante is the charitable recipient of funds.",
                },
                {
                  title: "Funds are allocated to local nonprofits",
                  detail: "Donations stay local and support district causes.",
                },
                {
                  title: "A small service fee supports operations",
                  detail: "Fees keep the platform reliable and compliant.",
                },
                {
                  title: "Results are reported publicly",
                  detail: "Impact data is shared through the platform.",
                },
              ].map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-accent-0 text-sm font-semibold text-brand-secondary-2">
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold">{step.title}</p>
                  </div>
                  <p className="mt-3 text-xs text-brand-secondary-0">
                    {step.detail}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section
            className="mt-14 info-fade-up"
            style={{ animationDelay: "320ms" }}
          >
            <h2 className="font-brand-heading text-2xl font-semibold">
              Why this structure exists
            </h2>
            <ul className="mt-4 grid gap-3 text-sm text-brand-secondary-0 md:grid-cols-2">
              <li>
                Nonprofits are not built to develop and maintain software.
              </li>
              <li>
                Long-term fundraising requires consistent execution and support.
              </li>
              <li>
                Separating stewardship from operations protects both sides.
              </li>
              <li>
                Transparency increases trust for districts, donors, and
                partners.
              </li>
            </ul>
          </section>

          <section
            className="mt-14 info-fade-up"
            style={{ animationDelay: "380ms" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-6">
              <div>
                <h2 className="font-brand-heading text-xl font-semibold">
                  Looking for donor clarity?
                </h2>
                <p className="mt-2 text-sm text-brand-secondary-0">
                  Read the Up the Ante stewardship page before a transaction.
                </p>
              </div>
              <Link
                className="rounded-full border border-brand-secondary-1 bg-brand-accent-0 px-4 py-2 text-sm font-semibold text-brand-secondary-2 transition hover:bg-brand-accent-1"
                href="/info/uptheante"
              >
                Up the Ante stewardship
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
