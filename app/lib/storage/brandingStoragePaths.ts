// utils/branding/storage.ts

/**
 * Normalizes filenames to avoid collisions and ensure URL safety.
 * Removes spaces, forces lowercase, strips unsafe characters.
 */
export function sanitizeFilename(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_.-]+/g, "-") // replace unsafe chars
        .replace(/-+/g, "-") // collapse repeated "-"
        .replace(/^-|-$/g, ""); // trim leading/trailing "-"
}

/**
 * Extracts the lowercase file extension from a filename.
 * Returns extension without the dot.
 */
function extractExtension(name: string): string {
    const parts = name.split(".");
    if (parts.length < 2) {
        return "";
    }
    return parts.pop()!.toLowerCase();
}

/**
 * File path for DISTRICT-LEVEL logos.
 * Ex: branding-logos/{district_id}/district/{logo_id}/logo.{ext}
 */
export function districtLogoPath(
    districtId: string,
    logoId: string,
    file: File,
): string {
    const ext = extractExtension(file.name);
    return `${districtId}/district/${logoId}/logo.${ext}`;
}

/**
 * File path for SCHOOL-LEVEL logos.
 * Ex: branding-logos/{district_id}/schools/{school_id}/{logo_id}/logo.{ext}
 */
export function schoolLogoPath(
    districtId: string,
    schoolId: string,
    logoId: string,
    file: File,
): string {
    const ext = extractExtension(file.name);
    return `${districtId}/schools/${schoolId}/${logoId}/logo.${ext}`;
}

/**
 * File path for ATHLETICS logos (White Hawks, sport-specific marks, etc.)
 * Ex: branding-logos/{district_id}/athletics/{logo_id}/logo.{ext}
 */
export function athleticsLogoPath(
    districtId: string,
    logoId: string,
    file: File,
): string {
    const ext = extractExtension(file.name);
    return `${districtId}/athletics/${logoId}/logo.${ext}`;
}

/**
 * File path for COMMUNITY EDUCATION logos.
 * Ex: branding-logos/{district_id}/community_ed/{logo_id}/logo.{ext}
 */
export function communityEdLogoPath(
    districtId: string,
    logoId: string,
    file: File,
): string {
    const ext = extractExtension(file.name);
    return `${districtId}/community_ed/${logoId}/logo.${ext}`;
}

/**
 * File path for TEAM logos (sport-specific).
 * Ex: branding-logos/{district_id}/teams/{team_id}/{logo_id}/logo.{ext}
 */
export function teamLogoPath(
    districtId: string,
    teamId: string,
    logoId: string,
    file: File,
): string {
    const ext = extractExtension(file.name);
    return `${districtId}/teams/${teamId}/${logoId}/logo.${ext}`;
}

/**
 * File path for BRAND PATTERNS.
 * Ex: branding-patterns/{district_id}/{pattern_type}/{pattern_id}/logo.{ext}
 * patternType: "small" | "large" or your enum-to-string mapping.
 */
export function patternFilePath(
    districtId: string,
    patternType: "small" | "large",
    patternId: string,
    file: File,
): string {
    const ext = extractExtension(file.name);
    return `${districtId}/${patternType}/${patternId}/logo.${ext}`;
}

/**
 * File path for FONT FILES.
 * Ex: branding-fonts/{district_id}/{font_id}/logo.{ext}
 */
export function fontFilePath(
    districtId: string,
    fontId: string,
    file: File,
): string {
    const ext = extractExtension(file.name);
    return `${districtId}/${fontId}/logo.${ext}`;
}
