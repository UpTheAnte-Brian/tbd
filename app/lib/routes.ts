export function entityPath(entityId: string, tab?: string): string {
  const safeId = encodeURIComponent(entityId);
  if (!tab || tab === "overview") {
    return `/entities/${safeId}`;
  }
  const params = new URLSearchParams({ tab });
  return `/entities/${safeId}?${params.toString()}`;
}
