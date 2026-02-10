export function stripPublicSchoolDistrictSuffix(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const stripped = trimmed.replace(/\s+Public School District\s*$/i, "").trim();
  return stripped || trimmed;
}
