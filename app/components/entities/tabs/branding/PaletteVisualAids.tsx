"use client";

import {
  bestTextColor,
  contrastRatio,
  normalizeHex,
  relativeLuminance,
} from "@/app/lib/branding/colorUtils";
import { DEFAULT_BRAND_PALETTES } from "@/app/lib/branding/resolveBranding";

export type PaletteSlots = {
  primary: string[];
  secondary: string[];
  accent: string[];
};

export type PaletteRecommendations = {
  primaryBackgroundIndex?: number;
  secondaryInkIndex?: number;
  accentCtaIndex?: number;
};

type Props = {
  palette: PaletteSlots;
  recommendedMapping?: PaletteRecommendations;
};

const fallbackPalette = {
  primary: DEFAULT_BRAND_PALETTES.primary,
  secondary: DEFAULT_BRAND_PALETTES.secondary,
  accent: DEFAULT_BRAND_PALETTES.accent,
};

const sanitizeColors = (colors: string[]): string[] =>
  colors
    .map((color) => normalizeHex(color))
    .filter((color): color is string => Boolean(color));

const fillColors = (
  colors: string[],
  fallback: [string, string, string],
  options: { duplicateThird?: boolean } = {},
): [string, string, string] => {
  const resolved: [string, string, string] = [
    colors[0] ?? fallback[0],
    colors[1] ?? fallback[1],
    colors[2] ?? fallback[2],
  ];

  if (options.duplicateThird && !colors[2]) {
    resolved[2] = colors[0] ?? fallback[0];
  }

  return resolved;
};

const clampIndex = (value: number | undefined): number | null =>
  typeof value === "number" && value >= 0 && value <= 2 ? value : null;

const pickIndexByLuminance = (
  colors: [string, string, string],
  direction: "light" | "dark",
): number => {
  let bestIndex = 0;
  let bestValue = direction === "light" ? -1 : 2;

  colors.forEach((color, idx) => {
    const lum = relativeLuminance(color);
    if (lum === null) return;
    const compare = direction === "light" ? lum > bestValue : lum < bestValue;
    if (compare) {
      bestValue = lum;
      bestIndex = idx;
    }
  });

  return bestIndex;
};

const isSameColor = (a?: string, b?: string): boolean => {
  const aNorm = a ? normalizeHex(a) : null;
  const bNorm = b ? normalizeHex(b) : null;
  return Boolean(aNorm && bNorm && aNorm === bNorm);
};

const textColorForSurface = (foreground: string, surface: string): string => {
  const ratio = contrastRatio(foreground, surface);
  if (ratio !== null && ratio >= 4.5) return foreground;
  return bestTextColor(surface);
};

const UsageBar = ({
  primary,
  secondary,
  accent,
}: {
  primary: string;
  secondary: string;
  accent: string;
}) => (
  <div className="flex h-3 w-full overflow-hidden rounded border border-brand-secondary-1">
    <div style={{ width: "60%", backgroundColor: primary }} />
    <div style={{ width: "30%", backgroundColor: secondary }} />
    <div style={{ width: "10%", backgroundColor: accent }} />
  </div>
);

export default function PaletteVisualAids({
  palette,
  recommendedMapping,
}: Props) {
  const primaryRaw = sanitizeColors(palette.primary ?? []);
  const secondaryRaw = sanitizeColors(palette.secondary ?? []);
  const accentRaw = sanitizeColors(palette.accent ?? []);

  const primary = fillColors(primaryRaw, fallbackPalette.primary, {
    duplicateThird: true,
  });
  const secondary = fillColors(secondaryRaw, fallbackPalette.secondary);
  const accent = fillColors(accentRaw, fallbackPalette.accent);

  const primaryBackgroundIndex =
    clampIndex(recommendedMapping?.primaryBackgroundIndex) ??
    pickIndexByLuminance(primary, "light");
  const secondaryInkIndex =
    clampIndex(recommendedMapping?.secondaryInkIndex) ??
    pickIndexByLuminance(secondary, "dark");
  const accentCtaIndex =
    clampIndex(recommendedMapping?.accentCtaIndex) ?? 0;

  const primarySurface = primary[primaryBackgroundIndex];
  const primaryStrong = primary[0];
  const secondarySurface = secondary[0];
  const secondaryAlt = secondary[2];
  const accentCta = accent[accentCtaIndex];
  const accentHover = accent[1];
  const accentBadge = accent[2];

  const ink = secondary[secondaryInkIndex];
  const textOnPrimary = textColorForSurface(ink, primarySurface);
  const textOnSecondary = textColorForSurface(ink, secondarySurface);

  const suggestions: string[] = [];
  const primary1Lum = relativeLuminance(primary[1]);
  if (primary1Lum !== null && primary1Lum < 0.8) {
    suggestions.push(
      "primary-1 looks dark; consider a lighter value for background use.",
    );
  }
  if (!primaryRaw[2] || isSameColor(primaryRaw[2], primaryRaw[1])) {
    suggestions.push(
      "If you only have two primaries, duplicate primary-0 into primary-2.",
    );
  }
  if (secondaryInkIndex !== 1) {
    suggestions.push(
      "secondary-1 should usually be the darkest neutral for text.",
    );
  }

  const hasAnyColors =
    primaryRaw.length + secondaryRaw.length + accentRaw.length > 0;

  return (
    <div className="mt-6 space-y-6 rounded-lg border border-brand-secondary-1 bg-brand-secondary-2 p-4 text-brand-secondary-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Palette Usage Preview</h3>
          <p className="text-xs text-brand-secondary-0 opacity-70">
            60/30/10 usage mock + CTA states
          </p>
        </div>
        {!hasAnyColors ? (
          <span className="text-xs text-brand-secondary-0 opacity-60">
            Using default palette until colors are added.
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3 rounded border border-brand-secondary-1 bg-brand-secondary-1 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-brand-secondary-0 opacity-70">
            <span>60/30/10 Usage Mock</span>
            <span className="normal-case opacity-60">Primary / Secondary / Accent</span>
          </div>
          <UsageBar primary={primarySurface} secondary={secondarySurface} accent={accentCta} />
          <div
            className="rounded-lg border border-brand-secondary-1 p-4 space-y-3"
            style={{ backgroundColor: primarySurface, color: textOnPrimary }}
          >
            <div
              className="h-6 w-3/5 rounded"
              style={{ backgroundColor: primaryStrong }}
            />
            <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
              <div
                className="rounded p-3 text-xs"
                style={{ backgroundColor: secondarySurface, color: textOnSecondary }}
              >
                Secondary surface
              </div>
              <div
                className="rounded p-3 text-xs"
                style={{ backgroundColor: secondaryAlt, color: bestTextColor(secondaryAlt) }}
              >
                Supporting card
              </div>
            </div>
            <button
              className="inline-flex w-fit items-center rounded px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: accentCta, color: bestTextColor(accentCta) }}
            >
              Accent CTA
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded border border-brand-secondary-1 bg-brand-secondary-1 p-4">
          <div className="text-xs uppercase tracking-wider text-brand-secondary-0 opacity-70">
            CTA and States
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: accentCta, color: bestTextColor(accentCta) }}
            >
              Primary Button
            </button>
            <button
              className="rounded border px-3 py-1 text-xs font-semibold"
              style={{ borderColor: accentCta, color: accentCta }}
            >
              Secondary Button
            </button>
            <span
              className="text-xs underline underline-offset-2"
              style={{ color: accentCta }}
            >
              Link Style
            </span>
            <span
              className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ backgroundColor: accentBadge, color: bestTextColor(accentBadge) }}
            >
              Badge
            </span>
            <span
              className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ backgroundColor: accentHover, color: bestTextColor(accentHover) }}
            >
              Hover
            </span>
          </div>
        </div>
      </div>

      {suggestions.length ? (
        <div className="rounded border border-dashed border-brand-secondary-1 bg-brand-secondary-1/30 p-3 text-xs text-brand-secondary-0">
          <div className="mb-2 font-semibold uppercase tracking-wider opacity-70">
            Gentle Suggestions
          </div>
          <ul className="list-disc list-inside space-y-1 opacity-80">
            {suggestions.map((note, idx) => (
              <li key={`${note}-${idx}`}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
