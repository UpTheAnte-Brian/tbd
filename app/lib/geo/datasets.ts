export type ParsedDataset = {
  dataset_key: string;
  version: string;
  label?: string;
};

export const DATASET_LABELS: Record<string, string> = {
  mn_mde_struc_school_program_locs: "MN School Program Locations (MDE)",
  mn_mde_bdry_school_attendance_areas: "MN School Attendance Areas (MDE)",
  mn_mde_bdry_school_district_boundaries: "MN School District Boundaries (MDE)",
  us_census_tiger_us_state: "US States (Census TIGER)",
};

const SY_PATTERN = /^(.*)_(SY\d{4}_\d{2})$/;
const TIGER_PATTERN = /^(.*)_(TIGER\d{4})$/;

export function parseSourceTag(
  source: string | null | undefined
): ParsedDataset | null {
  if (!source) return null;
  const trimmed = source.trim();
  if (!trimmed) return null;

  const syMatch = trimmed.match(SY_PATTERN);
  if (syMatch) {
    const datasetKey = syMatch[1];
    const version = syMatch[2];
    return {
      dataset_key: datasetKey,
      version,
      label: DATASET_LABELS[datasetKey],
    };
  }

  const tigerMatch = trimmed.match(TIGER_PATTERN);
  if (tigerMatch) {
    const datasetKey = tigerMatch[1];
    const version = tigerMatch[2];
    return {
      dataset_key: datasetKey,
      version,
      label: DATASET_LABELS[datasetKey],
    };
  }

  return null;
}

export function parseDatasetFromSource(
  source: string | null | undefined
): { datasetKey: string; datasetVersion: string } | null {
  const parsed = parseSourceTag(source);
  if (!parsed) return null;
  return {
    datasetKey: parsed.dataset_key,
    datasetVersion: parsed.version,
  };
}
