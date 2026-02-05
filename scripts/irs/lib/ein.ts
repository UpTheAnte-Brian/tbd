export function normalizeEinInput(
    input: string | null | undefined,
): string | null {
    if (!input) return null;
    const digits = String(input).replace(/\D/g, "");
    if (!digits) return null;
    if (digits.length === 9) return digits;
    if (digits.length < 9) return digits.padStart(9, "0");
    return null;
}

export function formatEinDashed(einNormalized: string): string {
    if (!/^\d{9}$/.test(einNormalized)) {
        throw new Error(`Expected 9-digit EIN; got ${einNormalized}`);
    }
    return `${einNormalized.slice(0, 2)}-${einNormalized.slice(2)}`;
}
