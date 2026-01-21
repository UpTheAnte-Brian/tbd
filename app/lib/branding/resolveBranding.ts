import type {
  BrandingPalette,
  BrandingTypography,
} from "@/app/lib/types/types";
import { normalizeHex } from "@/app/lib/branding/colorUtils";

export type PaletteRole = "primary" | "secondary" | "accent";
export const PALETTE_ROLES: PaletteRole[] = ["primary", "secondary", "accent"];

export type PaletteInput = {
  id?: string;
  name: string;
  role: PaletteRole;
  colors: string[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type PaletteSlotVM = {
  slot: number;
  hex: string;
  isOverride: boolean;
  overrideHex?: string | null;
  defaultHex: string;
};

export type CanonicalPalette = {
  key: PaletteRole;
  label: string;
  role: PaletteRole;
  id?: string;
  name: string;
  colors: [string, string, string];
  slots: PaletteSlotVM[];
  isPlaceholder: boolean;
  isIncomplete: boolean;
};

export type CanonicalPalettes = Record<PaletteRole, CanonicalPalette>;

export type BrandColorTokens = {
  primary0: string;
  primary1: string;
  primary2: string;
  secondary0: string;
  secondary1: string;
  secondary2: string;
  accent0: string;
  accent1: string;
  accent2: string;
};

export type BrandTypographyTokens = {
  header1: string;
  header2: string;
  subheader: string;
  body: string;
  display: string;
  logo: string;
};

export type ResolvedBranding = {
  colors: BrandColorTokens;
  typography: BrandTypographyTokens;
};

export const DEFAULT_BRAND_COLORS: BrandColorTokens = {
  primary0: "#da2b1f",
  primary1: "#ffffff",
  primary2: "#da2b1f",
  secondary0: "#50534c",
  secondary1: "#2c2a29",
  secondary2: "#a7a9b4",
  accent0: "#94292e",
  accent1: "#ff3a1e",
  accent2: "#6d3235",
};

export const DEFAULT_BRAND_PALETTES: Record<
  PaletteRole,
  [string, string, string]
> = {
  primary: [
    DEFAULT_BRAND_COLORS.primary0,
    DEFAULT_BRAND_COLORS.primary1,
    DEFAULT_BRAND_COLORS.primary2,
  ],
  secondary: [
    DEFAULT_BRAND_COLORS.secondary0,
    DEFAULT_BRAND_COLORS.secondary1,
    DEFAULT_BRAND_COLORS.secondary2,
  ],
  accent: [
    DEFAULT_BRAND_COLORS.accent0,
    DEFAULT_BRAND_COLORS.accent1,
    DEFAULT_BRAND_COLORS.accent2,
  ],
};

export const DEFAULT_BRAND_PALETTE_LABELS: Record<PaletteRole, string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
};

export const DEFAULT_BRAND_TYPOGRAPHY: BrandTypographyTokens = {
  header1: "Inter",
  header2: "Inter",
  subheader: "Inter",
  body: "Inter",
  display: "Inter",
  logo: "Inter",
};

const asColor = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const fillPalette = (
  colors: unknown,
  fallback: [string, string, string],
): [string, string, string] => {
  const normalized = normalizePaletteColors(colors);
  if (normalized.length === 0) {
    return fallback;
  }
  const resolved = [
    asColor(normalized[0]) ?? fallback[0],
    asColor(normalized[1]) ?? fallback[1],
    asColor(normalized[2]) ?? fallback[2],
  ] as [string, string, string];
  return resolved;
};

const resolveTypography = (
  typography: BrandingTypography[] = [],
): BrandTypographyTokens => {
  const byRole = (role: string) =>
    typography.find((t) => t.role === role)?.font_name?.trim() || null;

  const fallback =
    byRole("body") ||
    typography[0]?.font_name?.trim() ||
    DEFAULT_BRAND_TYPOGRAPHY.body;

  const body = byRole("body") || fallback;
  const header1 = byRole("header1") || fallback;
  const header2 = byRole("header2") || header1;
  const subheader = byRole("subheader") || header2;
  const display = byRole("display") || header1;
  const logo = byRole("logo") || display;

  return {
    body,
    header1,
    header2,
    subheader,
    display,
    logo,
  };
};

const normalizePaletteRole = (palette: BrandingPalette): PaletteRole | null => {
  const role = palette.role === "tertiary" ? "accent" : palette.role;
  if (role === "primary" || role === "secondary" || role === "accent") {
    return role;
  }

  const name = palette.name?.toLowerCase() ?? "";
  if (name.includes("primary")) return "primary";
  if (name.includes("secondary")) return "secondary";
  if (name.includes("accent") || name.includes("tertiary")) return "accent";

  return null;
};

const paletteTimestamp = (palette: BrandingPalette): number => {
  const updated = palette.updated_at ? Date.parse(palette.updated_at) : NaN;
  if (Number.isFinite(updated)) return updated;
  const created = palette.created_at ? Date.parse(palette.created_at) : NaN;
  if (Number.isFinite(created)) return created;
  return 0;
};

function normalizePaletteColors(colors: unknown): string[] {
  if (!Array.isArray(colors)) return [];

  const hasSlot = colors.some((color) => {
    if (!color || typeof color !== "object") return false;
    const slot = (color as { slot?: unknown }).slot;
    return typeof slot === "number" && Number.isFinite(slot);
  });

  const ordered = hasSlot
    ? [...colors].sort((a, b) => {
        const slotA =
          typeof (a as { slot?: unknown })?.slot === "number"
            ? ((a as { slot?: number }).slot as number)
            : Number.MAX_SAFE_INTEGER;
        const slotB =
          typeof (b as { slot?: unknown })?.slot === "number"
            ? ((b as { slot?: number }).slot as number)
            : Number.MAX_SAFE_INTEGER;
        return slotA - slotB;
      })
    : colors;

  return ordered
    .map((color) => {
      if (typeof color === "string") return normalizeHex(color);
      if (!color || typeof color !== "object") return null;
      const hex = (color as { hex?: unknown }).hex;
      return typeof hex === "string" ? normalizeHex(hex) : null;
    })
    .filter((color): color is string => Boolean(color));
}

const buildOverrideMap = (colors: unknown): Map<number, string> => {
  const overrides = new Map<number, string>();
  if (!Array.isArray(colors)) return overrides;

  colors.forEach((color, index) => {
    if (typeof color === "string") {
      const normalized = normalizeHex(color);
      if (normalized) overrides.set(index, normalized);
      return;
    }

    if (!color || typeof color !== "object") return;
    const slotValue = (color as { slot?: unknown }).slot;
    const slot =
      typeof slotValue === "number" && Number.isFinite(slotValue)
        ? slotValue
        : index;
    if (!Number.isInteger(slot) || slot < 0) return;

    const hexValue = (color as { hex?: unknown }).hex;
    const normalized =
      typeof hexValue === "string" ? normalizeHex(hexValue) : null;
    if (normalized) {
      overrides.set(slot, normalized);
    }
  });

  return overrides;
};

const fillPaletteColors = (
  role: PaletteRole,
  rawColors: string[],
  defaults: [string, string, string],
): [string, string, string] => {
  const colors: [string, string, string] = [...defaults];

  for (let i = 0; i < 3; i += 1) {
    if (rawColors[i]) colors[i] = rawColors[i];
  }

  if (role === "primary") {
    if (!rawColors[1]) {
      colors[1] = defaults[1];
    }
    if (rawColors.length > 0 && rawColors.length < 3) {
      colors[2] = colors[0];
    }
  }

  return colors;
};

const buildPaletteName = (entityName: string, label: string): string => {
  const clean = entityName.trim();
  if (!clean) return label;
  return `${clean} ${label}`.trim();
};

export const toPaletteMap = (
  raw: BrandingPalette[] | null | undefined,
  entityName = "",
): CanonicalPalettes => {
  const paletteMap = new Map<PaletteRole, BrandingPalette>();

  for (const palette of raw ?? []) {
    const role = normalizePaletteRole(palette);
    if (!role) continue;
    const existing = paletteMap.get(role);
    if (!existing || paletteTimestamp(palette) > paletteTimestamp(existing)) {
      paletteMap.set(role, palette);
    }
  }

  const result = {} as CanonicalPalettes;

  for (const role of PALETTE_ROLES) {
    const defaults = DEFAULT_BRAND_PALETTES[role];
    const palette = paletteMap.get(role);
    const normalized = normalizePaletteColors(palette?.colors);
    const colors = fillPaletteColors(role, normalized, defaults);
    const overrideMap = buildOverrideMap(palette?.colors);
    const slots: PaletteSlotVM[] = colors.map((hex, index) => {
      const overrideHex = overrideMap.get(index) ?? null;
      return {
        slot: index,
        hex,
        isOverride: overrideMap.has(index),
        overrideHex,
        defaultHex: defaults[index] ?? hex,
      };
    });
    const isPlaceholder = !palette;
    const isIncomplete = Boolean(palette && normalized.length < 3);
    const label = DEFAULT_BRAND_PALETTE_LABELS[role];
    const name = palette?.name ?? buildPaletteName(entityName, label);

    result[role] = {
      key: role,
      label,
      role,
      id: palette?.id,
      name,
      colors,
      slots,
      isPlaceholder,
      isIncomplete,
    };
  }

  return result;
};

export const resolveBrandingTokens = (
  palettes: BrandingPalette[] = [],
  typography: BrandingTypography[] = [],
): ResolvedBranding => {
  const primaryPalette =
    palettes.find((p) => p.role === "primary") || null;
  const primaryColors = fillPalette(primaryPalette?.colors, [
    DEFAULT_BRAND_COLORS.primary0,
    DEFAULT_BRAND_COLORS.primary1,
    DEFAULT_BRAND_COLORS.primary2,
  ]);

  const secondaryPalette = palettes.find((p) => p.role === "secondary") || null;
  const secondaryColors = secondaryPalette
    ? fillPalette(secondaryPalette.colors, [
        DEFAULT_BRAND_COLORS.secondary0,
        DEFAULT_BRAND_COLORS.secondary1,
        DEFAULT_BRAND_COLORS.secondary2,
      ])
    : ([
        DEFAULT_BRAND_COLORS.secondary0,
        DEFAULT_BRAND_COLORS.secondary1,
        DEFAULT_BRAND_COLORS.secondary2,
      ] as [string, string, string]);

  const accentPalette = palettes.find((p) => p.role === "accent") || null;
  const accentColors = accentPalette
    ? fillPalette(accentPalette.colors, [
        DEFAULT_BRAND_COLORS.accent0,
        DEFAULT_BRAND_COLORS.accent1,
        DEFAULT_BRAND_COLORS.accent2,
      ])
    : ([
        DEFAULT_BRAND_COLORS.accent0,
        DEFAULT_BRAND_COLORS.accent1,
        DEFAULT_BRAND_COLORS.accent2,
      ] as [string, string, string]);

  const tokens: BrandColorTokens = {
    primary0: primaryColors[0],
    primary1: primaryColors[1],
    primary2: primaryColors[2],
    secondary0: secondaryColors[0],
    secondary1: secondaryColors[1],
    secondary2: secondaryColors[2],
    accent0: accentColors[0],
    accent1: accentColors[1],
    accent2: accentColors[2],
  };

  return {
    colors: tokens,
    typography: resolveTypography(typography),
  };
};

export const buildBrandCssVars = (tokens: ResolvedBranding) => {
  const vars: Record<string, string> = {
    "--brand-primary-0": tokens.colors.primary0,
    "--brand-primary-1": tokens.colors.primary1,
    "--brand-primary-2": tokens.colors.primary2,
    "--brand-secondary-0": tokens.colors.secondary0,
    "--brand-secondary-1": tokens.colors.secondary1,
    "--brand-secondary-2": tokens.colors.secondary2,
    "--brand-accent-0": tokens.colors.accent0,
    "--brand-accent-1": tokens.colors.accent1,
    "--brand-accent-2": tokens.colors.accent2,
    "--brand-font-family": tokens.typography.body,
    "--brand-font-header1": tokens.typography.header1,
    "--brand-font-header2": tokens.typography.header2,
    "--brand-font-subheader": tokens.typography.subheader,
    "--brand-font-heading": tokens.typography.header1,
    "--brand-font-display": tokens.typography.display,
    "--brand-font-logo": tokens.typography.logo,
  };

  return vars;
};
