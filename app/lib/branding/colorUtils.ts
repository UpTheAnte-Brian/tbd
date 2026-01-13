const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export const isValidHex = (value: string): boolean =>
  HEX_COLOR.test(value.trim());

export const normalizeHex = (value: string): string | null => {
  const trimmed = value.trim();
  if (!isValidHex(trimmed)) return null;
  return trimmed.toUpperCase();
};

export const hexToRgb = (hex: string): RgbColor | null => {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const match = normalized.match(HEX_COLOR);
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

export const parseHexToRgb = hexToRgb;

const linearize = (value: number): number => {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
};

export const relativeLuminanceFromRgb = (rgb: RgbColor): number => {
  const r = linearize(rgb.r);
  const g = linearize(rgb.g);
  const b = linearize(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const relativeLuminance = (input: string | RgbColor): number | null => {
  const rgb = typeof input === "string" ? hexToRgb(input) : input;
  if (!rgb) return null;
  return relativeLuminanceFromRgb(rgb);
};

export const contrastRatio = (foreground: string, background: string): number | null => {
  const lumA = relativeLuminance(foreground);
  const lumB = relativeLuminance(background);
  if (lumA === null || lumB === null) return null;
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
};

export const bestTextColor = (background: string): string => {
  const white = "#FFFFFF";
  const black = "#000000";
  const whiteContrast = contrastRatio(white, background) ?? 0;
  const blackContrast = contrastRatio(black, background) ?? 0;
  return whiteContrast >= blackContrast ? white : black;
};

export const isLowContrast = (
  foreground: string,
  background: string,
  threshold = 4.5,
): boolean => {
  const ratio = contrastRatio(foreground, background);
  if (ratio === null) return true;
  return ratio < threshold;
};
