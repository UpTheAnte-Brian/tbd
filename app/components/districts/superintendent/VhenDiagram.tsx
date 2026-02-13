"use client";

import * as React from "react";

type VhenDiagramProps = {
  className?: string;
  /** Optional heading shown above the diagram. */
  title?: string;
  /**
   * Which 9-box token to use for the primary accent of the diagram.
   * Defaults to `--brand-accent-0`.
   */
  accentVar?:
    | "--brand-primary-0"
    | "--brand-primary-1"
    | "--brand-primary-2"
    | "--brand-secondary-0"
    | "--brand-secondary-1"
    | "--brand-secondary-2"
    | "--brand-accent-0"
    | "--brand-accent-1"
    | "--brand-accent-2";
  /**
   * Optional stroke token for outlines. Defaults to the same value as `accentVar`.
   */
  strokeVar?: VhenDiagramProps["accentVar"];
};

/**
 * High-level relationship diagram used on the District (Superintendent) dashboard.
 *
 * - Pure SVG (no external deps)
 * - Responsive
 * - Uses brand 9-box CSS variables (e.g., `--brand-accent-0`)
 */
export default function VhenDiagram({
  className,
  title,
  accentVar = "--brand-accent-0",
  strokeVar,
}: VhenDiagramProps) {
  const svgId = React.useId();
  const stroke = strokeVar ?? accentVar;

  // Fallback color ensures it still renders if a district hasn’t set branding yet.
  const accentCss = `var(${accentVar}, #ff3b6b)`;
  const strokeCss = `var(${stroke}, var(${accentVar}, #ff3b6b))`;

  return (
    <section className={className} aria-label={title ?? "Relationship diagram"}>
      {title ? (
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
      ) : null}

      <div className="w-full rounded-xl bg-background">
        <svg
          role="img"
          aria-labelledby={`${svgId}-title ${svgId}-desc`}
          viewBox="0 0 900 520"
          className="h-auto w-full"
        >
          <title id={`${svgId}-title`}>Ante Up Nation relationships</title>
          <desc id={`${svgId}-desc`}>
            A Venn-style illustration showing Nonprofits, Businesses, and
            District Leadership inside the Ante Up Nation sphere of influence,
            with Up the Ante (future Charity) pointing into the shared overlap.
          </desc>

          <defs>
            <filter
              id={`${svgId}-shadow`}
              x="-25%"
              y="-25%"
              width="150%"
              height="150%"
            >
              <feDropShadow
                dx="0"
                dy="10"
                stdDeviation="10"
                floodOpacity="0.18"
              />
            </filter>

            <style>{`
              .stroke-main { stroke: ${strokeCss}; }
              .fill-main { fill: ${accentCss}; }
              .label-text { fill: white; font: 700 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
              .label-small { fill: white; font: 700 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
              .hint { fill: rgba(0,0,0,0.0); }
            `}</style>
          </defs>

          {/* Outer "sphere of influence" */}
          <rect
            x="40"
            y="25"
            width="820"
            height="470"
            rx="36"
            ry="36"
            fill="none"
            className="stroke-main"
            strokeWidth="10"
          />

          {/* Venn ellipses */}
          <g fill="none" className="stroke-main" strokeWidth="10">
            {/* Nonprofits */}
            <ellipse cx="365" cy="260" rx="235" ry="175" />
            {/* Businesses */}
            <ellipse cx="610" cy="255" rx="215" ry="165" />
            {/* District leadership */}
            <ellipse cx="565" cy="360" rx="260" ry="150" />
          </g>

          {/* Up the Ante label + pointer */}
          <g filter={`url(#${svgId}-shadow)`}>
            <rect
              x="360"
              y="45"
              width="300"
              height="54"
              rx="14"
              className="fill-main"
            />
            {/* small downward pointer */}
            <path d="M 500 99 L 520 99 L 510 135 Z" className="fill-main" />
            <text x="510" y="80" textAnchor="middle" className="label-small">
              Up the Ante (future Charity)
            </text>
            {/* thin line into overlap */}
            <path
              d="M 510 135 C 520 185, 500 215, 485 250"
              className="stroke-main"
              strokeWidth="6"
              fill="none"
            />
          </g>

          {/* Label: Nonprofits */}
          <g filter={`url(#${svgId}-shadow)`}>
            <rect
              x="240"
              y="190"
              width="160"
              height="58"
              rx="16"
              className="fill-main"
            />
            <path d="M 320 248 L 350 248 L 335 278 Z" className="fill-main" />
            <text x="320" y="228" textAnchor="middle" className="label-text">
              Nonprofits
            </text>
          </g>

          {/* Label: Businesses */}
          <g filter={`url(#${svgId}-shadow)`}>
            <rect
              x="560"
              y="170"
              width="170"
              height="58"
              rx="16"
              className="fill-main"
            />
            <path d="M 645 228 L 675 228 L 660 258 Z" className="fill-main" />
            <text x="645" y="208" textAnchor="middle" className="label-text">
              Businesses
            </text>
          </g>

          {/* Label: District Leadership */}
          <g filter={`url(#${svgId}-shadow)`}>
            <rect
              x="455"
              y="395"
              width="250"
              height="60"
              rx="16"
              className="fill-main"
            />
            <path d="M 580 455 L 615 455 L 597 485 Z" className="fill-main" />
            <text x="580" y="434" textAnchor="middle" className="label-text">
              District Leadership
            </text>
          </g>

          {/* Bottom-left label: Sphere of Influence */}
          <g filter={`url(#${svgId}-shadow)`}>
            <rect
              x="85"
              y="385"
              width="280"
              height="92"
              rx="16"
              className="fill-main"
            />
            <text x="105" y="420" className="label-text">
              Ante Up Nation
            </text>
            <text x="105" y="452" className="label-text">
              Sphere&apos;s of Influence
            </text>
          </g>

          {/* Invisible padding rectangle for easier tapping/selection on touch devices */}
          <rect x="0" y="0" width="900" height="520" className="hint" />
        </svg>
      </div>
    </section>
  );
}
