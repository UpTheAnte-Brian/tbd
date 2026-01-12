export async function hashSignature(
    payload: Record<string, unknown>,
): Promise<string> {
    if (!globalThis.crypto?.subtle) {
        throw new Error("Signature hashing unavailable");
    }
    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}
