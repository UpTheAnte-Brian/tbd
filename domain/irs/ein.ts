export function normalizeEin(ein: string): string {
  return (ein ?? "").replace(/[^0-9]/g, "");
}

export function isValidEin(ein: string): boolean {
  const normalized = normalizeEin(ein);
  return normalized.length === 9;
}

export function formatEinDashed(ein: string | null | undefined): string | null {
  if (!ein) return null;
  const normalized = normalizeEin(ein);
  if (normalized.length !== 9) {
    return ein.trim() || null;
  }
  return `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
}
