"use client";

import * as React from "react";

type Slide = {
  title: string;
  subtitle?: string;
  bullets?: string[];
  body?: string[];
};

const SLIDES: Slide[] = [
  {
    title: "Governance Modernization for District-Affiliated Nonprofits",
    subtitle: "Ante Up Nation, LLC\nBrian Johnson, Founder",
  },
  {
    title: "The Current Landscape",
    body: [
      "Most mid-sized districts operate alongside 20–40 affiliated nonprofit entities.",
      "Across these organizations:",
    ],
    bullets: [
      "$1–5M cumulative net assets",
      "100–200 volunteer board members",
      "Mixed 990, 990EZ, and 990N filings",
      "Independent governance structures",
      "Limited consolidated visibility",
    ],
  },
  {
    title: "Key Risks & Gaps",
    bullets: [
      "Fragmentation: redundant missions; separate bylaws and policies",
      "Compliance ambiguity: inconsistent filing history; dormant entities still legally active",
      "Financial opacity: no consolidated asset snapshot; idle or under-leveraged capital",
      "Governance drift: board turnover without continuity; no standardized reporting cadence",
    ],
  },
  {
    title: "Why This Matters to the Board",
    bullets: [
      "Reputational exposure: affiliated nonprofits are publicly associated with the district",
      "Financial stewardship: community-raised funds deserve structured oversight and transparency",
      "Strategic alignment: nonprofit activity should reinforce district priorities",
      "Volunteer sustainability: governance clarity reduces friction and burnout",
    ],
  },
  {
    title: "Our Approach",
    bullets: [
      "Phase 1: Landscape Assessment — comprehensive registry and financial review",
      "Phase 2: Governance Modernization Strategy — standardization, consolidation, and modernization opportunities",
      "Phase 3: Implementation Support — optional structured rollout of governance improvements",
      "All work is advisory and collaborative",
    ],
  },
  {
    title: "What the District Receives",
    bullets: [
      "Consolidated nonprofit registry",
      "Multi-year financial summaries",
      "Asset aggregation snapshot",
      "Compliance overview",
      "Governance categorization",
      "Modernization roadmap",
      "Often the first district-level view of nonprofit exposure",
    ],
  },
  {
    title: "Modernization Opportunities May Include",
    bullets: [
      "Bylaw updates",
      "Governance standardization",
      "Consolidation or merger pathways",
      "Sunset planning for inactive entities",
      "Shared reporting infrastructure",
      "Role-based governance visibility",
      "Customized to district context",
    ],
  },
  {
    title: "How We Deliver",
    body: [
      "Ante Up Nation utilizes a structured governance infrastructure platform to:",
    ],
    bullets: [
      "Ingest IRS return data",
      "Standardize financial reporting",
      "Track governance activities",
      "Provide role-based visibility",
      "Enable repeatable analysis across districts",
      "Platform supports the engagement; it is not a required standalone adoption",
    ],
  },
  {
    title: "Expected Outcomes",
    bullets: [
      "Clear understanding of nonprofit landscape",
      "Reduced compliance ambiguity",
      "Improved governance continuity",
      "Increased transparency",
      "Stronger alignment with district priorities",
    ],
  },
  {
    title: "Engagement Structure & Next Step",
    bullets: [
      "Typical timeline: 8–12 week landscape assessment",
      "Strategy presentation to leadership and/or board",
      "Optional implementation support available",
      "Next step: exploratory discussion to scope a district-specific assessment proposal",
    ],
  },
  {
    title: "Engagement Investment",
    bullets: [
      "Landscape Assessment (Core Engagement): $9,500 – $14,500 (fixed fee)",
      "Optional Phase 2: Modernization Strategy & Implementation Planning: $18,000 – $45,000 (scope dependent)",
      "Value philosophy: deliver measurable governance clarity and financial visibility that materially exceeds the engagement investment",
    ],
  },
  {
    title: "Questions the District Will Be Able to Answer",
    body: ["Governance & People"],
    bullets: [
      "Who is the current treasurer (and what is their term / contact path)?",
      "Who leads the fundraising committee for each nonprofit?",
      "Where is the latest board roster, and when was it last updated?",
    ],
  },
  {
    title: "Questions (continued)",
    body: ["Financial Performance & Stewardship"],
    bullets: [
      "Which nonprofits generate the most investment income per dollar — and why?",
      "Which entities are constrained by endowment or donor restrictions?",
      "What would expand if restrictions were loosened or restructured?",
    ],
  },
  {
    title: "Questions (continued)",
    body: ["Operations, Transparency, Benchmarking"],
    bullets: [
      "What programs exist within each nonprofit, and what do they cost to run?",
      "What are revenue sources by program (fundraising, grants, fees, donations)?",
      "How do our nonprofits compare to neighboring districts (assets, filings, governance posture)?",
      "What best practices should we evaluate or adopt next?",
    ],
  },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function SuperintendentSlides(props: {
  className?: string;
  initialIndex?: number;
}) {
  const { className, initialIndex = 0 } = props;
  const [idx, setIdx] = React.useState(() =>
    clamp(initialIndex, 0, SLIDES.length - 1),
  );

  const slide = SLIDES[idx];

  const goPrev = React.useCallback(
    () => setIdx((i) => clamp(i - 1, 0, SLIDES.length - 1)),
    [],
  );
  const goNext = React.useCallback(
    () => setIdx((i) => clamp(i + 1, 0, SLIDES.length - 1)),
    [],
  );

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Home") setIdx(0);
      if (e.key === "End") setIdx(SLIDES.length - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  return (
    <div className={className}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-brand-secondary-0">
            Slide {idx + 1} / {SLIDES.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={idx === 0}
              className="rounded-md border border-brand-secondary-1 bg-brand-secondary-1 px-3 py-1.5 text-sm text-brand-primary-1 disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={idx === SLIDES.length - 1}
              className="rounded-md border border-brand-accent-1 bg-brand-primary-0 px-3 py-1.5 text-sm font-semibold text-brand-primary-1 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-brand-secondary-1 bg-brand-secondary-1 p-6 shadow-sm min-h-[150px] text-brand-primary-1">
          <div className="h-1 w-14 rounded-full bg-brand-primary-0" />
          <h3 className="mt-3 text-xl font-semibold leading-snug text-brand-primary-0">
            {slide.title}
          </h3>
          {slide.subtitle ? (
            <div className="mt-1 whitespace-pre-line text-sm text-brand-primary-1">
              {slide.subtitle}
            </div>
          ) : null}

          {slide.body?.length ? (
            <div className="mt-4 space-y-2 text-sm leading-relaxed text-brand-primary-1">
              {slide.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          ) : null}

          {slide.bullets?.length ? (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-brand-primary-1 marker:text-brand-primary-0">
              {slide.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.title + i}
              type="button"
              onClick={() => setIdx(i)}
              className={
                "rounded-md border border-brand-secondary-1 px-2 py-1 text-xs text-brand-primary-1 " +
                (i === idx
                  ? "bg-brand-primary-0 font-semibold"
                  : "text-brand-secondary-0 hover:text-brand-secondary-1")
              }
              aria-current={i === idx ? "true" : undefined}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SuperintendentSlides;
