import Link from "next/link";

export default function FundamentalsPage() {
  return (
    <div className="min-h-screen bg-brand-secondary-2 text-brand-primary-0 font-brand">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 -translate-x-1/3 -translate-y-1/3 rounded-full bg-brand-accent-0 opacity-20 blur-3xl info-float-slow" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 translate-x-1/4 translate-y-1/4 rounded-full bg-brand-primary-0 opacity-10 blur-3xl info-float-slower" />

        <div className="mx-auto max-w-6xl px-6 pb-20 pt-14">
          <div className="grid items-start gap-10 md:grid-cols-[1.1fr_0.9fr]">
            <div className="info-fade-up">
              <p className="text-sm uppercase tracking-[0.3em] text-brand-secondary-0">
                Round-up fundamentals
              </p>
              <h1 className="mt-4 font-brand-heading text-4xl font-semibold leading-tight md:text-5xl">
                Round-up fundraising works because small, repeated actions add
                up.
              </h1>
              <p className="mt-4 text-xl text-brand-secondary-0">
                A simple checkout prompt can generate reliable community funding
                without asking donors to stop what they’re doing or fill out a
                form.
              </p>
            </div>

            <div
              className="rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-6 info-fade-up"
              style={{ animationDelay: "120ms" }}
            >
              <h2 className="font-brand-heading text-2xl font-semibold">
                Why it performs
              </h2>
              <ul className="mt-4 space-y-3 text-base text-brand-secondary-0">
                <li>Low friction for customers.</li>
                <li>High frequency from everyday purchases.</li>
                <li>Predictable, trackable totals.</li>
                <li>Clear reporting builds trust.</li>
              </ul>
            </div>
          </div>

          <section
            className="mt-14 info-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            <h2 className="font-brand-heading text-3xl font-semibold">
              Proof that the model scales
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-6">
                <h3 className="font-brand-heading text-xl font-semibold">
                  Point-of-sale giving can be massive
                </h3>
                <p className="mt-3 text-base text-brand-secondary-0">
                  In 2024, Taco Bell’s Round Up program was highlighted as a top
                  point-of-sale fundraiser, reporting more than{" "}
                  <span className="font-semibold text-brand-primary-0">
                    $50M
                  </span>{" "}
                  raised with an average gift of about{" "}
                  <span className="font-semibold text-brand-primary-0">
                    $0.44
                  </span>
                  .
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <a
                    className="rounded-full border border-brand-secondary-1 bg-brand-secondary-2 px-3 py-1 text-brand-secondary-0 transition hover:bg-brand-secondary-1"
                    href="https://www.tacobellfoundation.org/events/tbf-awards-record-breaking-28-million-in-grants/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Taco Bell Foundation
                  </a>
                  <a
                    className="rounded-full border border-brand-secondary-1 bg-brand-secondary-2 px-3 py-1 text-brand-secondary-0 transition hover:bg-brand-secondary-1"
                    href="https://www.prnewswire.com/news-releases/taco-bell-foundation-unlocks-new-level-of-impact-with-28-million-in-community-grants--its-largest-giving-year-yet-302519898.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    PR Newswire
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-6">
                <h3 className="font-brand-heading text-xl font-semibold">
                  It’s easy to explain to donors
                </h3>
                <ul className="mt-3 space-y-3 text-base text-brand-secondary-0">
                  <li>You round up your total at checkout.</li>
                  <li>
                    The nonprofit receives the funds and holds them responsibly.
                  </li>
                  <li>Local causes are funded, then reported publicly.</li>
                  <li>Everything stays tied to a transparent ledger.</li>
                </ul>
              </div>
            </div>
          </section>

          <section
            className="mt-14 info-fade-up"
            style={{ animationDelay: "260ms" }}
          >
            <h2 className="font-brand-heading text-3xl font-semibold">
              What makes donors say “yes”
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "It’s small",
                  detail:
                    "The ask is usually under a dollar, so it feels easy and repeatable.",
                },
                {
                  title: "It’s local",
                  detail:
                    "People respond when the impact is connected to their community and schools.",
                },
                {
                  title: "It’s visible",
                  detail:
                    "Clear reporting turns a vague donation into something concrete and accountable.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-brand-secondary-1 bg-brand-secondary-1 p-6"
                >
                  <h3 className="font-brand-heading text-xl font-semibold">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-base text-brand-secondary-0">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section
            className="mt-14 info-fade-up"
            style={{ animationDelay: "320ms" }}
          >
            <h2 className="font-brand-heading text-3xl font-semibold">
              The simple operational checklist
            </h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Prompt at checkout",
                  detail:
                    "In-store, drive-thru, and online experiences can all support a round-up prompt.",
                },
                {
                  title: "Set a clear local beneficiary",
                  detail:
                    "Donors should know where funds go and how allocations are decided.",
                },
                {
                  title: "Publish transparent reporting",
                  detail:
                    "Share totals, distributions, and outcomes so trust compounds over time.",
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
                  Want the structure + stewardship context?
                </h2>
                <p className="mt-2 text-base text-brand-secondary-0">
                  See how the nonprofit and the operator work together, and how
                  funds stay transparent.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  className="rounded-full border border-brand-secondary-1 bg-brand-secondary-2 px-4 py-2 text-base font-semibold text-brand-secondary-0 transition hover:bg-brand-secondary-1"
                  href="/info/uptheante"
                >
                  Stewardship
                </Link>
                <Link
                  className="rounded-full border border-brand-secondary-1 bg-brand-accent-0 px-4 py-2 text-base font-semibold text-brand-secondary-2 transition hover:bg-brand-accent-1"
                  href="/info/growth"
                >
                  How it works
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
