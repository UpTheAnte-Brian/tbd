export function normalizeEin(ein: string): string {
  return (ein ?? "").replace(/[^0-9]/g, "");
}

export function isValidEin(ein: string): boolean {
  const normalized = normalizeEin(ein);
  return normalized.length === 9;
}
